import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { UpdateWorkflowCommand } from '@/commands/update/workflow';

import { setupTestCommand } from '@test-integration/utils/testCommand';
import * as testDb from '../../shared/testDb';
import { createWorkflowWithTrigger, getAllWorkflows } from '../../shared/db/workflows';
import { mockInstance } from '../../../shared/mocking';

mockInstance(InternalHooks);
mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(UpdateWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

test('update:workflow can activate all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([
		createWorkflowWithTrigger({}),
		createWorkflowWithTrigger({}),
	]);
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);

	//
	// ACT
	//
	await command.run(['--all', '--active=true']);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	expect(after).toMatchObject([{ active: true }, { active: true }]);
});

test('update:workflow can deactivate all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([
		createWorkflowWithTrigger({ active: true }),
		createWorkflowWithTrigger({ active: true }),
	]);
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);

	//
	// ACT
	//
	await command.run(['--all', '--active=false']);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	expect(after).toMatchObject([{ active: false }, { active: false }]);
});

test('update:workflow can activate a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = (
		await Promise.all([
			createWorkflowWithTrigger({ active: false }),
			createWorkflowWithTrigger({ active: false }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`, '--active=true']);

	//
	// ASSERT
	//
	const after = (await getAllWorkflows()).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(after).toMatchObject([{ active: true }, { active: false }]);
});

test('update:workflow can deactivate a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = (
		await Promise.all([
			createWorkflowWithTrigger({ active: true }),
			createWorkflowWithTrigger({ active: true }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`, '--active=false']);

	//
	// ASSERT
	//
	const after = (await getAllWorkflows()).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(after).toMatchObject([{ active: false }, { active: true }]);
});
