import 'reflect-metadata';
import { Controller, POST, Callable } from '../decorators';
import { CodeEngine } from '../engine';
import { getClassMetadata } from '../metadata';
import { analyzeCodeString } from '../static-analyzer';
import { createTracedInstance } from '../tracer';

/**
 * POC Integration Test — exercises the full code engine flow:
 *
 * 1. Static analysis: code string → StaticGraph (nodes + edges)
 * 2. Runtime execution: decorated class → Proxy tracer → ExecutionTrace
 * 3. CodeEngine orchestration: register → getRoutes → handler → trace
 * 4. Branching: if/else routing traces only the taken path
 */

const EXAMPLE_CODE = `
@Controller('/api')
class OrderAutomation {
  @POST('/orders')
  async handleOrder(req: Request) {
    return this.route(req.body);
  }

  @Callable('Route by type')
  route(data: { type: string }) {
    if (data.type === 'order') {
      return this.processOrder(data);
    }
    return this.handleInquiry(data);
  }

  @Callable('Process order')
  processOrder(data: unknown) {
    return { status: 'processed', id: Date.now() };
  }

  @Callable('Handle inquiry')
  handleInquiry(data: unknown) {
    return { status: 'received', message: 'We will get back to you' };
  }
}`;

describe('POC Integration: Full Code Engine Flow', () => {
	describe('Static Analysis', () => {
		it('should produce a complete graph from the example automation code', () => {
			const graph = analyzeCodeString(EXAMPLE_CODE);

			// 4 nodes: 1 trigger + 3 callables
			expect(graph.nodes).toHaveLength(4);

			const trigger = graph.nodes.find((n) => n.type === 'trigger');
			expect(trigger).toEqual(
				expect.objectContaining({
					id: 'handleOrder',
					type: 'trigger',
					method: 'POST',
					path: '/orders',
				}),
			);

			const callableIds = graph.nodes.filter((n) => n.type === 'callable').map((n) => n.id);
			expect(callableIds).toEqual(
				expect.arrayContaining(['route', 'processOrder', 'handleInquiry']),
			);

			// Edges: handleOrder → route, route → processOrder (if true), route → handleInquiry (no condition — implicit fallthrough)
			expect(graph.edges).toEqual(
				expect.arrayContaining([
					{ from: 'handleOrder', to: 'route' },
					{ from: 'route', to: 'processOrder', condition: 'true' },
					{ from: 'route', to: 'handleInquiry' },
				]),
			);
		});
	});

	describe('Runtime Tracing via Decorated Classes', () => {
		@Controller('/api')
		class OrderAutomation {
			@POST('/orders')
			handleOrder(body: unknown) {
				return this.route(body as { type: string });
			}

			@Callable('Route by type')
			route(data: { type: string }) {
				if (data.type === 'order') {
					return this.processOrder(data);
				}
				return this.handleInquiry(data);
			}

			@Callable('Process order')
			processOrder(_data: unknown) {
				return { status: 'processed', id: 12345 };
			}

			@Callable('Handle inquiry')
			handleInquiry(_data: unknown) {
				return { status: 'received', message: 'We will get back to you' };
			}
		}

		it('should trace a linear flow: trigger → callable chain', () => {
			const metadata = getClassMetadata(OrderAutomation);
			const instance = new OrderAutomation();
			const { proxy, getTrace } = createTracedInstance(instance, metadata);

			const result = proxy.processOrder({ amount: 100 });

			expect(result).toEqual({ status: 'processed', id: 12345 });

			const trace = getTrace();
			expect(trace.status).toBe('success');
			expect(trace.nodes).toHaveLength(1);
			expect(trace.nodes[0].id).toBe('processOrder');
			expect(trace.nodes[0].input).toEqual([{ amount: 100 }]);
			expect(trace.nodes[0].output).toEqual({ status: 'processed', id: 12345 });
		});

		it('should trace branching: order type routes to processOrder', () => {
			const metadata = getClassMetadata(OrderAutomation);
			const instance = new OrderAutomation();
			const { proxy, getTrace } = createTracedInstance(instance, metadata);

			const result = proxy.route({ type: 'order' });

			expect(result).toEqual({ status: 'processed', id: 12345 });

			const trace = getTrace();
			expect(trace.status).toBe('success');

			const executedNodeIds = trace.nodes.map((n) => n.id);
			expect(executedNodeIds).toContain('route');
			expect(executedNodeIds).toContain('processOrder');
			expect(executedNodeIds).not.toContain('handleInquiry');

			expect(trace.edges).toEqual(expect.arrayContaining([{ from: 'route', to: 'processOrder' }]));
		});

		it('should trace branching: inquiry type routes to handleInquiry', () => {
			const metadata = getClassMetadata(OrderAutomation);
			const instance = new OrderAutomation();
			const { proxy, getTrace } = createTracedInstance(instance, metadata);

			const result = proxy.route({ type: 'inquiry' });

			expect(result).toEqual({
				status: 'received',
				message: 'We will get back to you',
			});

			const trace = getTrace();
			expect(trace.status).toBe('success');

			const executedNodeIds = trace.nodes.map((n) => n.id);
			expect(executedNodeIds).toContain('route');
			expect(executedNodeIds).toContain('handleInquiry');
			expect(executedNodeIds).not.toContain('processOrder');

			expect(trace.edges).toEqual(expect.arrayContaining([{ from: 'route', to: 'handleInquiry' }]));
		});
	});

	describe('CodeEngine Orchestration', () => {
		it('should register class, expose routes, execute, and produce trace for order flow', async () => {
			@Controller('/api')
			class TestOrderAutomation {
				@POST('/orders')
				handleOrder(body: unknown) {
					return this.route(body as { type: string });
				}

				@Callable('Route by type')
				route(data: { type: string }) {
					if (data.type === 'order') {
						return this.processOrder(data);
					}
					return this.handleInquiry(data);
				}

				@Callable('Process order')
				processOrder(_data: unknown) {
					return { status: 'processed', id: 99 };
				}

				@Callable('Handle inquiry')
				handleInquiry(_data: unknown) {
					return { status: 'received' };
				}
			}

			const engine = new CodeEngine();
			engine.register(TestOrderAutomation);

			// 1. Routes are exposed
			const routes = engine.getRoutes();
			expect(routes).toHaveLength(1);
			expect(routes[0].method).toBe('POST');
			expect(routes[0].path).toBe('/api/orders');

			// 2. Execute with order type → processOrder branch
			const orderResult = await routes[0].handler({ type: 'order' });
			expect(orderResult).toEqual({ status: 'processed', id: 99 });

			const orderTrace = engine.getLastTrace()!;
			expect(orderTrace.status).toBe('success');
			expect(orderTrace.nodes.map((n) => n.id)).toContain('route');
			expect(orderTrace.nodes.map((n) => n.id)).toContain('processOrder');
			expect(orderTrace.nodes.map((n) => n.id)).not.toContain('handleInquiry');
			expect(orderTrace.edges).toEqual(
				expect.arrayContaining([{ from: 'route', to: 'processOrder' }]),
			);
		});

		it('should register class, expose routes, execute, and produce trace for inquiry flow', async () => {
			@Controller('/api')
			class TestInquiryAutomation {
				@POST('/inquiries')
				handleRequest(body: unknown) {
					return this.route(body as { type: string });
				}

				@Callable('Route by type')
				route(data: { type: string }) {
					if (data.type === 'order') {
						return this.processOrder(data);
					}
					return this.handleInquiry(data);
				}

				@Callable('Process order')
				processOrder(_data: unknown) {
					return { status: 'processed' };
				}

				@Callable('Handle inquiry')
				handleInquiry(_data: unknown) {
					return { status: 'received', message: 'Thanks' };
				}
			}

			const engine = new CodeEngine();
			engine.register(TestInquiryAutomation);

			const routes = engine.getRoutes();
			const inquiryResult = await routes[0].handler({ type: 'inquiry' });
			expect(inquiryResult).toEqual({ status: 'received', message: 'Thanks' });

			const inquiryTrace = engine.getLastTrace()!;
			expect(inquiryTrace.status).toBe('success');
			expect(inquiryTrace.nodes.map((n) => n.id)).toContain('route');
			expect(inquiryTrace.nodes.map((n) => n.id)).toContain('handleInquiry');
			expect(inquiryTrace.nodes.map((n) => n.id)).not.toContain('processOrder');
		});
	});

	describe('Error Handling', () => {
		it('should capture runtime errors in trace without losing execution context', async () => {
			@Controller('/api')
			class FailingAutomation {
				@POST('/process')
				handle(body: unknown) {
					return this.validate(body);
				}

				@Callable('Validate input')
				validate(data: unknown) {
					return this.transform(data);
				}

				@Callable('Transform data')
				transform(_data: unknown) {
					throw new Error('Invalid data format');
				}
			}

			const engine = new CodeEngine();
			engine.register(FailingAutomation);

			const routes = engine.getRoutes();
			await expect(routes[0].handler({ bad: true })).rejects.toThrow('Invalid data format');

			const trace = engine.getLastTrace()!;
			expect(trace.status).toBe('error');
			expect(trace.error).toBe('Invalid data format');

			// validate was called successfully (no error)
			const validateNode = trace.nodes.find((n) => n.id === 'validate');
			expect(validateNode).toBeDefined();

			// transform threw
			const transformNode = trace.nodes.find((n) => n.id === 'transform');
			expect(transformNode).toBeDefined();
			expect(transformNode!.error).toBe('Invalid data format');

			// Edge from validate → transform was recorded
			expect(trace.edges).toEqual(expect.arrayContaining([{ from: 'validate', to: 'transform' }]));
		});
	});

	describe('Static + Runtime Consistency', () => {
		it('should produce a static graph whose nodes match the runtime trace nodes', async () => {
			const graph = analyzeCodeString(EXAMPLE_CODE);

			// All static graph nodes should have valid IDs that match method names
			const staticNodeIds = new Set(graph.nodes.map((n) => n.id));
			expect(staticNodeIds).toEqual(
				new Set(['handleOrder', 'route', 'processOrder', 'handleInquiry']),
			);

			// All edges should reference valid node IDs
			for (const edge of graph.edges) {
				expect(staticNodeIds.has(edge.from)).toBe(true);
				expect(staticNodeIds.has(edge.to)).toBe(true);
			}

			// Runtime execution should produce trace nodes with same IDs
			@Controller('/api')
			class ConsistencyCheck {
				@POST('/orders')
				handleOrder(body: unknown) {
					return this.route(body as { type: string });
				}

				@Callable('Route by type')
				route(data: { type: string }) {
					if (data.type === 'order') {
						return this.processOrder(data);
					}
					return this.handleInquiry(data);
				}

				@Callable('Process order')
				processOrder(_data: unknown) {
					return { ok: true };
				}

				@Callable('Handle inquiry')
				handleInquiry(_data: unknown) {
					return { ok: true };
				}
			}

			const engine = new CodeEngine();
			engine.register(ConsistencyCheck);
			await engine.getRoutes()[0].handler({ type: 'order' });

			const trace = engine.getLastTrace()!;
			const traceNodeIds = new Set(trace.nodes.map((n) => n.id));

			// Every traced node should be a subset of static graph nodes
			for (const traceId of traceNodeIds) {
				expect(staticNodeIds.has(traceId)).toBe(true);
			}
		});
	});
});
