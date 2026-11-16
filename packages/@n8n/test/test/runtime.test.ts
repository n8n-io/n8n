import { executeWorkflow, loadWorkflow } from '../src';
import definition from './fixtures/runtime.json';

test('uses fixed runtime values, skips the wait, and passes input through a disabled node', async () => {
	const workflow = loadWorkflow(definition);
	const startedAt = Date.now();

	const result = await executeWorkflow(workflow, { input: { name: 'Ada' } });

	expect(Date.now() - startedAt).toBeLessThan(5_000);
	expect(result.output).toEqual([
		{
			executionId: 'test-execution-1',
			mode: 'production',
			active: true,
			workflowId: 'runtime-1',
			input: 'Ada',
			tagged: true,
		},
	]);
	expect(result.customData).toEqual({ source: 'test' });
});

test('starts from the supplied static data and returns it', async () => {
	const workflow = loadWorkflow(definition);

	const result = await executeWorkflow(workflow, { staticData: { global: { cursor: 7 } } });

	expect(result.staticData).toEqual({ global: { cursor: 7 } });
});
