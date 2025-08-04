'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const nanoid_1 = require('nanoid');
require('@/zod-alias-support');
const workflow_1 = require('@/commands/import/workflow');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const test_command_1 = require('@test-integration/utils/test-command');
const users_1 = require('../shared/db/users');
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const command = (0, test_command_1.setupTestCommand)(workflow_1.ImportWorkflowsCommand);
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'User']);
});
test('import:workflow should import active workflow and deactivate it', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-workflows/separate',
	]);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false }),
			expect.objectContaining({ name: 'inactive-workflow', active: false }),
		],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
			expect.objectContaining({
				workflowId: '999',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test('import:workflow should import active workflow from combined file and deactivate it', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined/combined.json',
	]);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false }),
			expect.objectContaining({ name: 'inactive-workflow', active: false }),
		],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
			expect.objectContaining({
				workflowId: '999',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test('import:workflow can import a single workflow object', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	await command.run(['--input=./test/integration/commands/import-workflows/combined/single.json']);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ name: 'active-workflow', active: false })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test('`import:workflow --userId ...` should fail if the workflow exists already and is owned by somebody else', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	const member = await (0, users_1.createMember)();
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);
	const before = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test("only update the workflow, don't create or update the owner if `--userId` is not passed", async () => {
	await (0, users_1.createOwner)();
	const member = await (0, users_1.createMember)();
	const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${member.id}`,
	]);
	const before = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: memberProject.id,
				role: 'workflow:owner',
			}),
		],
	});
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
	]);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow updated' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: memberProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test('`import:workflow --projectId ...` should fail if the credential already exists and is owned by another project', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	const member = await (0, users_1.createMember)();
	const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);
	const before = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}"`,
	);
	const after = {
		workflows: await (0, backend_test_utils_1.getAllWorkflows)(),
		sharings: await (0, backend_test_utils_1.getAllSharedWorkflows)(),
	};
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});
test('`import:workflow --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${(0, nanoid_1.nanoid)()}`,
			`--projectId=${(0, nanoid_1.nanoid)()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
//# sourceMappingURL=import.cmd.test.js.map
