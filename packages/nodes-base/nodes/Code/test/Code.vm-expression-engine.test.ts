import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { Expression } from 'n8n-workflow';

// With task runners off (the 1.x default) the Code node runs in vm2 and hands
// out its items as Proxy objects, which the VM expression engine can't copy
// as they are (CET-445). Code.node.test.ts runs the same workflow on the
// legacy engine.
describe('Code node output in expressions on the VM expression engine', () => {
	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine: 'vm',
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		});
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
		Expression.setExpressionEngine('legacy');
	});

	it('runs the expressions on the VM engine', () => {
		expect(Expression.getActiveImplementation()).toBe('vm');
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['Code.items-in-expressions.workflow.json'],
	});
});
