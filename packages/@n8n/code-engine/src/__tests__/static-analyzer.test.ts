import { analyzeCodeString } from '../static-analyzer';

describe('Static Analyzer', () => {
	it('should parse a linear flow (trigger → callable → callable)', () => {
		const code = `
@Controller('/api')
class OrderAutomation {
  @POST('/orders')
  async handleOrder(req: Request) {
    return this.processOrder(req.body);
  }

  @Callable('Process order')
  processOrder(data: unknown) {
    return this.formatResponse(data);
  }

  @Callable('Format response')
  formatResponse(data: unknown) {
    return { status: 'done', data };
  }
}`;

		const graph = analyzeCodeString(code);

		expect(graph.nodes).toHaveLength(3);
		expect(graph.nodes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'handleOrder',
					label: '/orders',
					type: 'trigger',
					method: 'POST',
					path: '/orders',
				}),
				expect.objectContaining({
					id: 'processOrder',
					label: 'Process order',
					type: 'callable',
				}),
				expect.objectContaining({
					id: 'formatResponse',
					label: 'Format response',
					type: 'callable',
				}),
			]),
		);

		expect(graph.edges).toEqual(
			expect.arrayContaining([
				{ from: 'handleOrder', to: 'processOrder' },
				{ from: 'processOrder', to: 'formatResponse' },
			]),
		);
	});

	it('should parse a branching flow with if/else', () => {
		const code = `
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
    } else {
      return this.handleInquiry(data);
    }
  }

  @Callable('Process order')
  processOrder(data: unknown) {
    return { status: 'processed' };
  }

  @Callable('Handle inquiry')
  handleInquiry(data: unknown) {
    return { status: 'received' };
  }
}`;

		const graph = analyzeCodeString(code);

		expect(graph.nodes).toHaveLength(4);

		const routeEdges = graph.edges.filter((e) => e.from === 'route');
		expect(routeEdges).toHaveLength(2);
		expect(routeEdges).toEqual(
			expect.arrayContaining([
				{ from: 'route', to: 'processOrder', condition: 'true' },
				{ from: 'route', to: 'handleInquiry', condition: 'false' },
			]),
		);
	});

	it('should handle leaf nodes (no outgoing calls)', () => {
		const code = `
@Controller('/api')
class TestClass {
  @POST('/start')
  start(req: Request) {
    return this.leaf(req.body);
  }

  @Callable('Leaf node')
  leaf(data: unknown) {
    return { done: true };
  }
}`;

		const graph = analyzeCodeString(code);

		expect(graph.nodes).toHaveLength(2);
		expect(graph.edges).toHaveLength(1);
		expect(graph.edges[0]).toEqual({ from: 'start', to: 'leaf' });
	});

	it('should extract controller base path', () => {
		const code = `
@Controller('/webhooks')
class MyClass {
  @POST('/incoming')
  handle(req: Request) {
    return this.process(req.body);
  }

  @Callable('Process')
  process(data: unknown) {
    return data;
  }
}`;

		const graph = analyzeCodeString(code);
		const triggerNode = graph.nodes.find((n) => n.type === 'trigger');
		expect(triggerNode?.path).toBe('/incoming');
	});

	it('should handle multiple this.method() calls in one method without branching', () => {
		const code = `
@Controller('/api')
class TestClass {
  @POST('/start')
  start(req: Request) {
    const a = this.stepOne(req.body);
    return this.stepTwo(a);
  }

  @Callable('Step one')
  stepOne(data: unknown) { return data; }

  @Callable('Step two')
  stepTwo(data: unknown) { return data; }
}`;

		const graph = analyzeCodeString(code);

		const startEdges = graph.edges.filter((e) => e.from === 'start');
		expect(startEdges).toHaveLength(2);
		expect(startEdges).toEqual(
			expect.arrayContaining([
				{ from: 'start', to: 'stepOne' },
				{ from: 'start', to: 'stepTwo' },
			]),
		);
	});

	it('should parse a branching flow with switch statement', () => {
		const code = `
@Controller('/api')
class ProductCatalog {
  @GET('/products')
  async getProducts(req: Request) {
    return this.filterByCategory(req.query.category);
  }

  @Callable('Filter by category')
  filterByCategory(category: string) {
    switch (category) {
      case 'electronics':
        return this.getElectronics();
      case 'books':
        return this.getBooks();
      default:
        return this.getAllProducts();
    }
  }

  @Callable('Get electronics')
  getElectronics() {
    return { products: [{ name: 'Laptop', price: 999 }] };
  }

  @Callable('Get books')
  getBooks() {
    return { products: [{ name: 'TypeScript Handbook', price: 39 }] };
  }

  @Callable('Get all products')
  getAllProducts() {
    return { products: [] };
  }
}`;

		const graph = analyzeCodeString(code);

		expect(graph.nodes).toHaveLength(5);

		const triggerNode = graph.nodes.find((n) => n.type === 'trigger');
		expect(triggerNode).toEqual(
			expect.objectContaining({
				id: 'getProducts',
				type: 'trigger',
				method: 'GET',
				path: '/products',
			}),
		);

		const filterEdges = graph.edges.filter((e) => e.from === 'filterByCategory');
		expect(filterEdges).toHaveLength(3);
		expect(filterEdges).toEqual(
			expect.arrayContaining([
				{ from: 'filterByCategory', to: 'getElectronics', condition: "'electronics'" },
				{ from: 'filterByCategory', to: 'getBooks', condition: "'books'" },
				{ from: 'filterByCategory', to: 'getAllProducts', condition: 'default' },
			]),
		);
	});

	it('should return empty graph for code without decorators', () => {
		const code = `
class PlainClass {
  doSomething() {
    return 42;
  }
}`;

		const graph = analyzeCodeString(code);
		expect(graph.nodes).toHaveLength(0);
		expect(graph.edges).toHaveLength(0);
	});
});
