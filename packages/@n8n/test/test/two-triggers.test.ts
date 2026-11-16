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

test('rejects a trigger option that names an unknown node', async () => {
	const workflow = loadWorkflow(definition);

	await expect(executeWorkflow(workflow, { trigger: 'Schedule' })).rejects.toMatchObject({
		code: 'TRIGGER_NOT_FOUND',
		message: 'Node "Schedule" is not an active trigger. Triggers: Manual start, Webhook.',
	});
});

test('rejects a trigger option that references a node of another workflow', async () => {
	const workflow = loadWorkflow(definition);
	const other = loadWorkflow({ ...definition, name: 'Other' });

	await expect(executeWorkflow(workflow, { trigger: other.node('Webhook') })).rejects.toMatchObject(
		{
			code: 'TRIGGER_NOT_FOUND',
			message: 'Node "Webhook" belongs to workflow "Other", not to "Two triggers".',
		},
	);
});
