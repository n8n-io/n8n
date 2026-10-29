import {
	mockInstance,
	testDb,
	createManyActiveWorkflows,
	getWorkflowById,
} from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import {
	AuthRolesService,
	type User,
	WebhookRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationOutboxStatus,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { type INodeType, UserError } from 'n8n-workflow';

import { UnpublishWorkflowCommand } from '@/commands/unpublish/workflow';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { removeAllRoleScopes } from '../../shared/db/roles';
import { createOwner } from '../../shared/db/users';

mockInstance(LoadNodesAndCredentials);
const externalHooks = mockInstance(ExternalHooks);
const nodeTypes = mockInstance(NodeTypes);
const command = setupTestCommand(UnpublishWorkflowCommand);

const publishEvents = async (workflowId: string) =>
	(
		await Container.get(WorkflowPublishHistoryRepository).find({
			where: { workflowId },
			order: { id: 'ASC' },
		})
	).map(({ event, versionId, userId }) => ({ event, versionId, userId }));

const insertWebhookRow = async (workflowId: string, path: string) =>
	await Container.get(WebhookRepository).insert({
		workflowId,
		webhookPath: path,
		method: 'POST',
		node: 'Webhook',
	});

let owner: User;

beforeEach(() => {
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: { properties: [] },
	} as unknown as INodeType);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'WebhookEntity',
		'WorkflowPublicationOutbox',
		'SharedWorkflow',
		'User',
	]);
	owner = await createOwner();
});

test('unpublish:workflow can unpublish all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2, {}, owner);

	//
	// ACT
	//
	await command.run(['--all']);

	//
	// ASSERT
	//
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: null,
		active: false,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('unpublish:workflow can unpublish a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2, {}, owner);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`]);

	//
	// ASSERT
	//
	const unpublishedWorkflow = await getWorkflowById(workflows[0].id);
	const activeWorkflow = await getWorkflowById(workflows[1].id);

	expect(unpublishedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
	expect(activeWorkflow).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('unpublish:workflow does nothing when neither --all nor --id is provided', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2, {}, owner);

	//
	// ACT
	//
	await command.run([]);

	//
	// ASSERT
	//
	// Verify workflows are still active
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: workflows[0].versionId,
		active: true,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('unpublish:workflow does nothing when both --all and --id are provided', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2, {}, owner);

	//
	// ACT
	//
	await command.run(['--all', '--id=123']);

	//
	// ASSERT
	//
	// Verify workflows are still active
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: workflows[0].versionId,
		active: true,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('unpublish:workflow throws error when workflow does not exist', async () => {
	//
	// ARRANGE
	//
	const nonExistentWorkflowId = 'non-existent-workflow-id';

	//
	// ACT & ASSERT
	//
	await expect(command.run([`--id=${nonExistentWorkflowId}`])).rejects.toThrow(
		`Workflow "${nonExistentWorkflowId}" not found.`,
	);
});

test('unpublish:workflow --id records deactivated by the owner and enqueues an unpublish', async () => {
	const [workflow] = await createManyActiveWorkflows(1, {}, owner);

	await command.run([`--id=${workflow.id}`]);

	expect(await publishEvents(workflow.id)).toEqual([
		{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
		{ event: 'deactivated', versionId: workflow.versionId, userId: owner.id },
	]);
	const outbox = await Container.get(WorkflowPublicationOutboxRepository).findBy({
		workflowId: workflow.id,
	});
	expect(outbox.map(({ status }) => status)).toEqual([WorkflowPublicationOutboxStatus.Pending]);
});

test('unpublish:workflow emits workflow-deactivated with source cli', async () => {
	const [workflow] = await createManyActiveWorkflows(1, {}, owner);
	const emit = vi.spyOn(Container.get(EventService), 'emit');

	await command.run([`--id=${workflow.id}`]);

	expect(emit).toHaveBeenCalledWith(
		'workflow-deactivated',
		expect.objectContaining({ workflowId: workflow.id, source: 'cli' }),
	);
});

test('unpublish:workflow --all unpublishes the rest when one workflow fails', async () => {
	const [blocked, ...others] = await createManyActiveWorkflows(3, {}, owner);
	externalHooks.run.mockImplementation(async (hookName, hookArgs) => {
		const [hookWorkflow] = (hookArgs ?? []) as Array<{ id?: string }>;
		if (hookName === 'workflow.deactivate' && hookWorkflow?.id === blocked.id) {
			throw new Error('Deactivation blocked');
		}
	});

	await expect(command.run(['--all'])).rejects.toThrow(blocked.id);

	for (const workflow of others) {
		expect((await getWorkflowById(workflow.id))?.activeVersionId).toBeNull();
	}
	expect((await getWorkflowById(blocked.id))?.activeVersionId).toBe(blocked.versionId);
});

describe('with the workflow publication service off', () => {
	let originalUseWorkflowPublicationService: boolean;

	beforeAll(() => {
		const { workflows } = Container.get(GlobalConfig);
		originalUseWorkflowPublicationService = workflows.useWorkflowPublicationService;
		workflows.useWorkflowPublicationService = false;
	});

	afterAll(() => {
		Container.get(GlobalConfig).workflows.useWorkflowPublicationService =
			originalUseWorkflowPublicationService;
	});

	test('unpublish:workflow --id deletes the webhook rows with the flag off', async () => {
		const [workflow] = await createManyActiveWorkflows(1, {}, owner);
		await insertWebhookRow(workflow.id, 'cap-24');

		await command.run([`--id=${workflow.id}`]);

		expect(await Container.get(WebhookRepository).countBy({ workflowId: workflow.id })).toBe(0);
		expect(await publishEvents(workflow.id)).toEqual([
			{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
			{ event: 'deactivated', versionId: workflow.versionId, userId: owner.id },
		]);
	});
});

describe('on a database that n8n never started', () => {
	beforeEach(async () => await removeAllRoleScopes());

	afterEach(async () => await Container.get(AuthRolesService).init());

	test('unpublish:workflow --id unpublishes as the owner', async () => {
		const [workflow] = await createManyActiveWorkflows(1, {}, owner);

		await command.run([`--id=${workflow.id}`]);

		expect((await getWorkflowById(workflow.id))?.activeVersionId).toBeNull();
	});

	test('unpublish:workflow --all unpublishes as the owner', async () => {
		const [workflow] = await createManyActiveWorkflows(1, {}, owner);

		await command.run(['--all']);

		expect((await getWorkflowById(workflow.id))?.activeVersionId).toBeNull();
	});
});

test('unpublish:workflow prints a refusal once without a stack trace', async () => {
	const logged = vi.spyOn(Container.get(Logger), 'error');
	const refusal = new UserError('Workflow "missing" not found.');
	const failedCommand = new UnpublishWorkflowCommand();

	await failedCommand.catch(refusal);
	await failedCommand.finally(refusal);

	expect(logged.mock.calls).toEqual([[refusal.message]]);
});
