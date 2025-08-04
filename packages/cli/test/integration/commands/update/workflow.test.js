'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const workflow_1 = require('@/commands/update/workflow');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const test_command_1 = require('@test-integration/utils/test-command');
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const command = (0, test_command_1.setupTestCommand)(workflow_1.UpdateWorkflowCommand);
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
});
test('update:workflow can activate all workflows', async () => {
	const workflows = await Promise.all([
		(0, backend_test_utils_1.createWorkflowWithTrigger)({}),
		(0, backend_test_utils_1.createWorkflowWithTrigger)({}),
	]);
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);
	await command.run(['--all', '--active=true']);
	const after = await (0, backend_test_utils_1.getAllWorkflows)();
	expect(after).toMatchObject([{ active: true }, { active: true }]);
});
test('update:workflow can deactivate all workflows', async () => {
	const workflows = await Promise.all([
		(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
		(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
	]);
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);
	await command.run(['--all', '--active=false']);
	const after = await (0, backend_test_utils_1.getAllWorkflows)();
	expect(after).toMatchObject([{ active: false }, { active: false }]);
});
test('update:workflow can activate a specific workflow', async () => {
	const workflows = (
		await Promise.all([
			(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: false }),
			(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: false }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);
	await command.run([`--id=${workflows[0].id}`, '--active=true']);
	const after = (await (0, backend_test_utils_1.getAllWorkflows)()).sort((wf1, wf2) =>
		wf1.id.localeCompare(wf2.id),
	);
	expect(after).toMatchObject([{ active: true }, { active: false }]);
});
test('update:workflow can deactivate a specific workflow', async () => {
	const workflows = (
		await Promise.all([
			(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
			(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);
	await command.run([`--id=${workflows[0].id}`, '--active=false']);
	const after = (await (0, backend_test_utils_1.getAllWorkflows)()).sort((wf1, wf2) =>
		wf1.id.localeCompare(wf2.id),
	);
	expect(after).toMatchObject([{ active: false }, { active: true }]);
});
//# sourceMappingURL=workflow.test.js.map
