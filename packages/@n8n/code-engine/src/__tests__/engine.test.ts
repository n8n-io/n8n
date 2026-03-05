import 'reflect-metadata';
import { Controller, POST, Callable } from '../decorators';
import { CodeEngine } from '../engine';

describe('CodeEngine', () => {
	it('should register a decorated class and expose routes', () => {
		@Controller('/api')
		class TestAutomation {
			@POST('/orders')
			handleOrder(body: unknown) {
				return this.process(body);
			}

			@Callable('Process')
			process(data: unknown) {
				return { done: true, data };
			}
		}

		const engine = new CodeEngine();
		engine.register(TestAutomation);

		const routes = engine.getRoutes();
		expect(routes).toHaveLength(1);
		expect(routes[0]).toEqual(
			expect.objectContaining({
				method: 'POST',
				path: '/api/orders',
			}),
		);
		expect(typeof routes[0].handler).toBe('function');
	});

	it('should execute route handler and produce a trace', async () => {
		@Controller('/api')
		class TestAutomation {
			@POST('/items')
			handleItem(body: unknown) {
				return this.transform(body);
			}

			@Callable('Transform')
			transform(data: unknown) {
				return { transformed: true, data };
			}
		}

		const engine = new CodeEngine();
		engine.register(TestAutomation);

		const routes = engine.getRoutes();
		const result = await routes[0].handler({ name: 'test' });

		expect(result).toEqual({ transformed: true, data: { name: 'test' } });

		const trace = engine.getLastTrace();
		expect(trace).toBeDefined();
		expect(trace!.status).toBe('success');
		expect(trace!.nodes).toHaveLength(1);
		expect(trace!.nodes[0].id).toBe('transform');
	});

	it('should trace branching execution', async () => {
		@Controller('/api')
		class BranchAutomation {
			@POST('/data')
			handle(body: { type: string }) {
				return this.route(body);
			}

			@Callable('Route')
			route(data: { type: string }) {
				if (data.type === 'a') return this.handleA(data);
				return this.handleB(data);
			}

			@Callable('Handle A')
			handleA(_data: unknown) {
				return { branch: 'a' };
			}

			@Callable('Handle B')
			handleB(_data: unknown) {
				return { branch: 'b' };
			}
		}

		const engine = new CodeEngine();
		engine.register(BranchAutomation);

		const routes = engine.getRoutes();
		const result = await routes[0].handler({ type: 'a' });

		expect(result).toEqual({ branch: 'a' });

		const trace = engine.getLastTrace()!;
		expect(trace.nodes.map((n) => n.id)).toContain('route');
		expect(trace.nodes.map((n) => n.id)).toContain('handleA');
		expect(trace.nodes.map((n) => n.id)).not.toContain('handleB');
	});

	it('should return static graph from registered classes', () => {
		@Controller('/api')
		class GraphAutomation {
			@POST('/start')
			start(body: unknown) {
				return this.step(body);
			}

			@Callable('Step')
			step(data: unknown) {
				return data;
			}
		}

		const engine = new CodeEngine();
		engine.register(GraphAutomation);

		const graph = engine.getStaticGraph();
		expect(graph.nodes).toHaveLength(2);
		expect(graph.nodes.map((n) => n.id)).toContain('start');
		expect(graph.nodes.map((n) => n.id)).toContain('step');
	});

	it('should capture errors in trace', async () => {
		@Controller('/api')
		class FailAutomation {
			@POST('/fail')
			handle() {
				return this.boom();
			}

			@Callable('Boom')
			boom() {
				throw new Error('explosion');
			}
		}

		const engine = new CodeEngine();
		engine.register(FailAutomation);

		const routes = engine.getRoutes();
		await expect(routes[0].handler({})).rejects.toThrow('explosion');

		const trace = engine.getLastTrace()!;
		expect(trace.status).toBe('error');
		expect(trace.nodes[0].error).toBe('explosion');
	});
});
