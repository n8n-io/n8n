import { executeWorkflow, loadWorkflow } from '../src';
import definition from './fixtures/two-triggers.json';

test('requires the trigger option when the workflow has more than one trigger', async () => {
	const workflow = loadWorkflow(definition);

	await expect(executeWorkflow(workflow, { input: {} })).rejects.toMatchObject({
		code: 'TRIGGER_NOT_FOUND',
		message:
			'The workflow has more than one trigger: Manual start, Webhook. Select one with the trigger option.',
	});
});

test('starts from the selected trigger', async () => {
	const workflow = loadWorkflow(definition);

	const result = await executeWorkflow(workflow, {
		trigger: workflow.node('Webhook'),
		input: { body: { name: 'Ada' } },
	});

	expect(result.output).toEqual([{ greeting: 'Hello Ada' }]);
	expect(result.node('Manual start').runs).toHaveLength(0);
});
