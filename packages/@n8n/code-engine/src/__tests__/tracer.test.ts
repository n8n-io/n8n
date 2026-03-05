import { createTracedInstance } from '../tracer';
import type { ClassMetadata } from '../types';

const metadata: ClassMetadata = {
	controller: { basePath: '/api' },
	httpMethods: [{ method: 'POST', path: '/orders', propertyKey: 'handleOrder' }],
	callables: [
		{ description: 'Route by type', propertyKey: 'route' },
		{ description: 'Process order', propertyKey: 'processOrder' },
		{ description: 'Handle inquiry', propertyKey: 'handleInquiry' },
	],
};

class OrderAutomation {
	handleOrder(body: unknown) {
		return this.route(body as { type: string });
	}

	route(data: { type: string }) {
		if (data.type === 'order') {
			return this.processOrder(data);
		}
		return this.handleInquiry(data);
	}

	processOrder(data: unknown) {
		return { status: 'processed', data };
	}

	handleInquiry(data: unknown) {
		return { status: 'received', data };
	}
}

describe('Runtime Tracer', () => {
	it('should trace a linear call chain correctly', () => {
		const instance = new OrderAutomation();
		const { proxy, getTrace } = createTracedInstance(instance, metadata);

		const result = proxy.processOrder({ id: 1 });

		expect(result).toEqual({ status: 'processed', data: { id: 1 } });

		const trace = getTrace();
		expect(trace.status).toBe('success');
		expect(trace.nodes).toHaveLength(1);
		expect(trace.nodes[0]).toEqual(
			expect.objectContaining({
				id: 'processOrder',
				label: 'Process order',
				type: 'callable',
				input: [{ id: 1 }],
				output: { status: 'processed', data: { id: 1 } },
			}),
		);
	});

	it('should trace branching — only the taken path', () => {
		const instance = new OrderAutomation();
		const { proxy, getTrace } = createTracedInstance(instance, metadata);

		const result = proxy.route({ type: 'order' });

		expect(result).toEqual({ status: 'processed', data: { type: 'order' } });

		const trace = getTrace();
		expect(trace.status).toBe('success');
		expect(trace.nodes).toHaveLength(2);

		const nodeIds = trace.nodes.map((n) => n.id);
		expect(nodeIds).toContain('route');
		expect(nodeIds).toContain('processOrder');
		expect(nodeIds).not.toContain('handleInquiry');
	});

	it('should record edges from parent to child calls', () => {
		const instance = new OrderAutomation();
		const { proxy, getTrace } = createTracedInstance(instance, metadata);

		proxy.route({ type: 'inquiry' });

		const trace = getTrace();
		expect(trace.edges).toEqual(expect.arrayContaining([{ from: 'route', to: 'handleInquiry' }]));
	});

	it('should record input and output accurately', () => {
		const instance = new OrderAutomation();
		const { proxy, getTrace } = createTracedInstance(instance, metadata);

		proxy.processOrder({ amount: 99 });

		const trace = getTrace();
		const node = trace.nodes.find((n) => n.id === 'processOrder');
		expect(node?.input).toEqual([{ amount: 99 }]);
		expect(node?.output).toEqual({ status: 'processed', data: { amount: 99 } });
	});

	it('should capture errors in trace', () => {
		class FailingClass {
			doWork() {
				throw new Error('something broke');
			}
		}

		const failMetadata: ClassMetadata = {
			controller: { basePath: '/api' },
			httpMethods: [],
			callables: [{ description: 'Do work', propertyKey: 'doWork' }],
		};

		const instance = new FailingClass();
		const { proxy, getTrace } = createTracedInstance(instance, failMetadata);

		expect(() => proxy.doWork()).toThrow('something broke');

		const trace = getTrace();
		expect(trace.status).toBe('error');
		expect(trace.nodes).toHaveLength(1);
		expect(trace.nodes[0].error).toBe('something broke');
	});

	it('should trace nested calls (A → B → C) with correct edges', () => {
		class Chain {
			a() {
				return this.b();
			}

			b() {
				return this.c();
			}

			c() {
				return 'done';
			}
		}

		const chainMeta: ClassMetadata = {
			controller: { basePath: '/api' },
			httpMethods: [],
			callables: [
				{ description: 'Step A', propertyKey: 'a' },
				{ description: 'Step B', propertyKey: 'b' },
				{ description: 'Step C', propertyKey: 'c' },
			],
		};

		const instance = new Chain();
		const { proxy, getTrace } = createTracedInstance(instance, chainMeta);

		const result = proxy.a();
		expect(result).toBe('done');

		const trace = getTrace();
		expect(trace.nodes).toHaveLength(3);
		expect(trace.edges).toEqual(
			expect.arrayContaining([
				{ from: 'a', to: 'b' },
				{ from: 'b', to: 'c' },
			]),
		);
		expect(trace.edges).not.toEqual(expect.arrayContaining([{ from: 'a', to: 'c' }]));
	});

	it('should record timing information', () => {
		const instance = new OrderAutomation();
		const { proxy, getTrace } = createTracedInstance(instance, metadata);

		proxy.processOrder({ id: 1 });

		const trace = getTrace();
		expect(trace.startedAt).toBeDefined();
		expect(trace.completedAt).toBeGreaterThanOrEqual(trace.startedAt);
		expect(trace.nodes[0].startedAt).toBeDefined();
		expect(trace.nodes[0].completedAt).toBeGreaterThanOrEqual(trace.nodes[0].startedAt);
	});

	describe('async support', () => {
		class AsyncService {
			async fetchData(id: number) {
				await Promise.resolve();
				return { id, name: 'item' };
			}

			async failingFetch() {
				await Promise.resolve();
				throw new Error('network error');
			}

			async orchestrate(id: number) {
				const data = await this.fetchData(id);
				return { result: data };
			}
		}

		const asyncMeta: ClassMetadata = {
			controller: { basePath: '/api' },
			httpMethods: [],
			callables: [
				{ description: 'Fetch data', propertyKey: 'fetchData' },
				{ description: 'Failing fetch', propertyKey: 'failingFetch' },
				{ description: 'Orchestrate', propertyKey: 'orchestrate' },
			],
		};

		it('should record resolved output for async callables', async () => {
			const instance = new AsyncService();
			const { proxy, getTrace } = createTracedInstance(instance, asyncMeta);

			const result = await proxy.fetchData(42);

			expect(result).toEqual({ id: 42, name: 'item' });

			const trace = getTrace();
			expect(trace.status).toBe('success');
			expect(trace.nodes).toHaveLength(1);
			expect(trace.nodes[0].output).toEqual({ id: 42, name: 'item' });
		});

		it('should record error for async rejection', async () => {
			const instance = new AsyncService();
			const { proxy, getTrace } = createTracedInstance(instance, asyncMeta);

			await expect(proxy.failingFetch()).rejects.toThrow('network error');

			const trace = getTrace();
			expect(trace.status).toBe('error');
			expect(trace.nodes).toHaveLength(1);
			expect(trace.nodes[0].error).toBe('network error');
		});

		it('should trace nested async calls with correct edges', async () => {
			const instance = new AsyncService();
			const { proxy, getTrace } = createTracedInstance(instance, asyncMeta);

			const result = await proxy.orchestrate(7);

			expect(result).toEqual({ result: { id: 7, name: 'item' } });

			const trace = getTrace();
			expect(trace.nodes).toHaveLength(2);
			expect(trace.edges).toEqual(
				expect.arrayContaining([{ from: 'orchestrate', to: 'fetchData' }]),
			);
		});

		it('should handle mixed sync and async callables', async () => {
			class MixedService {
				syncStep() {
					return 'sync-result';
				}

				async asyncStep() {
					await Promise.resolve();
					return 'async-result';
				}

				async run() {
					const a = this.syncStep();
					const b = await this.asyncStep();
					return { a, b };
				}
			}

			const mixedMeta: ClassMetadata = {
				controller: { basePath: '/api' },
				httpMethods: [],
				callables: [
					{ description: 'Sync step', propertyKey: 'syncStep' },
					{ description: 'Async step', propertyKey: 'asyncStep' },
					{ description: 'Run', propertyKey: 'run' },
				],
			};

			const instance = new MixedService();
			const { proxy, getTrace } = createTracedInstance(instance, mixedMeta);

			const result = await proxy.run();

			expect(result).toEqual({ a: 'sync-result', b: 'async-result' });

			const trace = getTrace();
			expect(trace.nodes).toHaveLength(3);

			const syncNode = trace.nodes.find((n) => n.id === 'syncStep');
			const asyncNode = trace.nodes.find((n) => n.id === 'asyncStep');
			expect(syncNode?.output).toBe('sync-result');
			expect(asyncNode?.output).toBe('async-result');
		});

		it('should record correct timing for async callables', async () => {
			class SlowService {
				async slow() {
					await new Promise((resolve) => setTimeout(resolve, 50));
					return 'done';
				}
			}

			const slowMeta: ClassMetadata = {
				controller: { basePath: '/api' },
				httpMethods: [],
				callables: [{ description: 'Slow op', propertyKey: 'slow' }],
			};

			const instance = new SlowService();
			const { proxy, getTrace } = createTracedInstance(instance, slowMeta);

			await proxy.slow();

			const trace = getTrace();
			const node = trace.nodes[0];
			expect(node.completedAt - node.startedAt).toBeGreaterThanOrEqual(40);
		});
	});

	describe('callbacks', () => {
		it('should fire onNodeEnter and onNodeExit for sync callables', () => {
			const enterCalls: Array<{ nodeId: string; args: unknown[] }> = [];
			const exitCalls: Array<{
				nodeId: string;
				output: unknown;
				durationMs: number;
				error?: string;
			}> = [];

			const instance = new OrderAutomation();
			const { proxy } = createTracedInstance(instance, metadata, {
				onNodeEnter: (nodeId, _meta, args) => {
					enterCalls.push({ nodeId, args });
				},
				onNodeExit: (nodeId, _meta, output, durationMs, error) => {
					exitCalls.push({ nodeId, output, durationMs, error });
				},
			});

			proxy.processOrder({ id: 1 });

			expect(enterCalls).toHaveLength(1);
			expect(enterCalls[0].nodeId).toBe('processOrder');
			expect(enterCalls[0].args).toEqual([{ id: 1 }]);

			expect(exitCalls).toHaveLength(1);
			expect(exitCalls[0].nodeId).toBe('processOrder');
			expect(exitCalls[0].output).toEqual({ status: 'processed', data: { id: 1 } });
			expect(exitCalls[0].error).toBeUndefined();
		});

		it('should fire onNodeExit with error for sync exceptions', () => {
			class Failing {
				fail() {
					throw new Error('boom');
				}
			}

			const failMeta: ClassMetadata = {
				controller: { basePath: '/api' },
				httpMethods: [],
				callables: [{ description: 'Fail', propertyKey: 'fail' }],
			};

			const exitCalls: Array<{ nodeId: string; error?: string }> = [];

			const instance = new Failing();
			const { proxy } = createTracedInstance(instance, failMeta, {
				onNodeExit: (nodeId, _meta, _output, _durationMs, error) => {
					exitCalls.push({ nodeId, error });
				},
			});

			expect(() => proxy.fail()).toThrow('boom');

			expect(exitCalls).toHaveLength(1);
			expect(exitCalls[0].error).toBe('boom');
		});

		it('should fire onNodeExit with resolved output for async callables', async () => {
			class AsyncSvc {
				async fetch() {
					await Promise.resolve();
					return 'data';
				}
			}

			const asyncMeta: ClassMetadata = {
				controller: { basePath: '/api' },
				httpMethods: [],
				callables: [{ description: 'Fetch', propertyKey: 'fetch' }],
			};

			const exitCalls: Array<{ nodeId: string; output: unknown; error?: string }> = [];

			const instance = new AsyncSvc();
			const { proxy } = createTracedInstance(instance, asyncMeta, {
				onNodeExit: (nodeId, _meta, output, _durationMs, error) => {
					exitCalls.push({ nodeId, output, error });
				},
			});

			await proxy.fetch();

			expect(exitCalls).toHaveLength(1);
			expect(exitCalls[0].output).toBe('data');
			expect(exitCalls[0].error).toBeUndefined();
		});

		it('should fire onNodeExit with error for async rejection', async () => {
			class AsyncSvc {
				async fail() {
					await Promise.resolve();
					throw new Error('async boom');
				}
			}

			const asyncMeta: ClassMetadata = {
				controller: { basePath: '/api' },
				httpMethods: [],
				callables: [{ description: 'Fail', propertyKey: 'fail' }],
			};

			const exitCalls: Array<{ nodeId: string; error?: string }> = [];

			const instance = new AsyncSvc();
			const { proxy } = createTracedInstance(instance, asyncMeta, {
				onNodeExit: (nodeId, _meta, _output, _durationMs, error) => {
					exitCalls.push({ nodeId, error });
				},
			});

			await expect(proxy.fail()).rejects.toThrow('async boom');

			expect(exitCalls).toHaveLength(1);
			expect(exitCalls[0].error).toBe('async boom');
		});
	});
});
