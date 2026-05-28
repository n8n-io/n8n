import {
	mockInstance,
	testDb,
	getPersonalProject,
	getAllSharedWorkflows,
	getAllWorkflows,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowPublishHistoryRepository, WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { nanoid } from 'nanoid';

import '@/zod-alias-support';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createMember, createOwner } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublishHistoryRepository);

const command = setupTestCommand(ImportWorkflowsCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'User']);
});

test('import:workflow should import active workflow and deactivate it', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-workflows/separate',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false, activeVersionId: null }),
			expect.objectContaining({ name: 'inactive-workflow', active: false, activeVersionId: null }),
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
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined/combined.json',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false, activeVersionId: null }),
			expect.objectContaining({ name: 'inactive-workflow', active: false, activeVersionId: null }),
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
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run(['--input=./test/integration/commands/import-workflows/combined/single.json']);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false, activeVersionId: null }),
		],
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
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
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

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name DID NOT change.
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
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${member.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
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

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name changed.
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
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
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

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name DID NOT change.
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
			`--userId=${nanoid()}`,
			`--projectId=${nanoid()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});

test('should preserve versionMetadata from JSON file when importing', async () => {
	//
	// ARRANGE
	//
	await createOwner();

	//
	// ACT
	//
	await command.run([
		'--input=./test/integration/commands/import-workflows/with-history/workflow-with-metadata.json',
	]);

	//
	// ASSERT
	//
	const workflows = await getAllWorkflows();
	expect(workflows).toHaveLength(1);
	expect(workflows[0].id).toBe('test-workflow-123');
	expect(workflows[0].name).toBe('Workflow with History Metadata');

	const workflowHistoryRecords = await Container.get(WorkflowHistoryRepository).find({
		where: { workflowId: 'test-workflow-123' },
	});

	expect(workflowHistoryRecords).toHaveLength(1);
	expect(workflowHistoryRecords[0].name).toBe('Historical Version Name');
	expect(workflowHistoryRecords[0].description).toBe('Historical version description');
});

describe('--activeState flag', () => {
	const globalConfig = Container.get(GlobalConfig);
	const originalMode = globalConfig.executions.mode;

	beforeAll(() => {
		globalConfig.executions.mode = 'queue';
	});

	afterAll(() => {
		globalConfig.executions.mode = originalMode;
	});

	describe('fromJson', () => {
		it('should activate a workflow that is marked as active in the imported json', async () => {
			await createOwner();

			await command.run([
				'--separate',
				'--input=./test/integration/commands/import-workflows/separate',
				'--activeState=fromJson',
			]);

			const workflowsInDB = await getAllWorkflows();
			const activeWorkflow = workflowsInDB.find((w) => w.name === 'active-workflow');
			const inactiveWorkflow = workflowsInDB.find((w) => w.name === 'inactive-workflow');

			expect(workflowsInDB).toHaveLength(2);
			expect(activeWorkflow).toMatchObject({ active: true });
			expect(activeWorkflow?.activeVersionId).toBe(activeWorkflow?.versionId);
			expect(inactiveWorkflow).toMatchObject({ active: false, activeVersionId: null });

			const activeWorkflowManager = Container.get(ActiveWorkflowManager);
			expect(activeWorkflowManager.add).toHaveBeenCalledWith('998', 'activate');
			expect(activeWorkflowManager.add).not.toHaveBeenCalledWith('999', expect.anything());
		});

		it('should deactivate the previously active version and activate the new version when importing a workflow json with an ID that already exists for an active workflow', async () => {
			await createOwner();

			await command.run([
				'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
				'--activeState=fromJson',
			]);

			const [first] = await getAllWorkflows();
			const v1VersionId = first.versionId;
			expect(first).toMatchObject({ id: '998', active: true, name: 'active-workflow' });
			expect(first.activeVersionId).toBe(v1VersionId);

			await command.run([
				'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
				'--activeState=fromJson',
			]);

			const [second] = await getAllWorkflows();
			expect(second).toMatchObject({
				id: '998',
				active: true,
				name: 'active-workflow updated',
			});
			expect(second.versionId).not.toBe(v1VersionId);
			expect(second.activeVersionId).toBe(second.versionId);

			const activeWorkflowManager = Container.get(ActiveWorkflowManager);
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('998');
			expect(activeWorkflowManager.add).toHaveBeenLastCalledWith('998', 'activate');

			const publishHistoryRepo = Container.get(WorkflowPublishHistoryRepository);
			expect(publishHistoryRepo.addRecord).toHaveBeenCalledTimes(2);
			expect(publishHistoryRepo.addRecord).toHaveBeenLastCalledWith({
				workflowId: '998',
				versionId: second.versionId,
				event: 'activated',
				userId: null,
			});
		});
	});

	describe('false', () => {
		it('should deactivate a workflow that is active in the workflow json to import', async () => {
			await createOwner();
			const fixture =
				'./test/integration/commands/import-workflows/separate/001-activeWorkflow.json';

			await command.run([`--input=${fixture}`, '--activeState=fromJson']);

			const [active] = await getAllWorkflows();
			expect(active).toMatchObject({ id: '998', active: true });
			expect(active.activeVersionId).toBe(active.versionId);

			const activeWorkflowManager = Container.get(ActiveWorkflowManager);
			jest.mocked(activeWorkflowManager.add).mockClear();
			jest.mocked(activeWorkflowManager.remove).mockClear();

			await command.run([`--input=${fixture}`, '--activeState=false']);

			const [deactivated] = await getAllWorkflows();
			expect(deactivated).toMatchObject({
				id: '998',
				name: 'active-workflow',
				active: false,
				activeVersionId: null,
			});

			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('998');
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});
	});
});
