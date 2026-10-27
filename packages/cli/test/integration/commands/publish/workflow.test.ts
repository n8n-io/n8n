import {
	mockInstance,
	testDb,
	createActiveWorkflow,
	createWorkflowWithHistory,
	createWorkflowWithTriggerAndHistory,
	getWorkflowById,
} from '@n8n/backend-test-utils';

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	type User,
	WebhookRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationOutboxStatus,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, INodeType } from 'n8n-workflow';

import { PublishWorkflowCommand } from '@/commands/publish/workflow';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createOwner } from '../../shared/db/users';
import { createWorkflowHistoryItem } from '../../shared/db/workflow-history';

mockInstance(LoadNodesAndCredentials);
mockInstance(ExternalHooks);
const publisher = mockInstance(Publisher);
const nodeTypes = mockInstance(NodeTypes);
const command = setupTestCommand(PublishWorkflowCommand);

const WEBHOOK_PATH = 'cap-24';

const APPLIES_SHORTLY_NOTE =
	'A running n8n applies this change shortly. If n8n is stopped, it applies the change when it starts.';

const RESTART_NOTE = 'Restart n8n to apply this change to a running instance.';

const REPUBLISH_REFUSED =
	'Republishing a published workflow from the CLI is not supported when the publication service is off and multi-main is not enabled.';

const webhookNode: INode = {
	id: 'webhook-node',
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
	webhookId: 'cap-24-webhook-id',
};

const publishEvents = async (workflowId: string) =>
	(
		await Container.get(WorkflowPublishHistoryRepository).find({
			where: { workflowId },
			order: { id: 'ASC' },
		})
	).map(({ event, versionId, userId }) => ({ event, versionId, userId }));

let owner: User;

beforeEach(() => {
	nodeTypes.getByNameAndVersion.mockImplementation(
		(type) =>
			({
				description: {
					name: type,
					properties: [],
					webhooks:
						type === webhookNode.type
							? [{ name: 'default', httpMethod: 'POST', path: WEBHOOK_PATH, isFullPath: true }]
							: undefined,
				},
				trigger: async () => ({}),
			}) as unknown as INodeType,
	);
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

test('publish:workflow can publish a specific workflow version', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

	//
	// ACT
	//
	await command.run([`--id=${workflow.id}`, `--versionId=${workflow.versionId}`]);

	//
	// ASSERT
	//
	const updatedWorkflow = await getWorkflowById(workflow.id);

	expect(updatedWorkflow).toMatchObject({
		activeVersionId: workflow.versionId,
		active: true,
	});
});

test('publish:workflow does not publish when --all flag is used', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

	//
	// ACT
	//
	await command.run(['--all', `--id=${workflow.id}`, `--versionId=${workflow.versionId}`]);

	//
	// ASSERT
	//
	// Verify the workflow was not published (--all flag prevents publishing)
	const unchangedWorkflow = await getWorkflowById(workflow.id);
	expect(unchangedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('publish:workflow publishes current version when --versionId is missing', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

	//
	// ACT
	//
	await command.run([`--id=${workflow.id}`]);

	//
	// ASSERT
	//
	const updatedWorkflow = await getWorkflowById(workflow.id);
	expect(updatedWorkflow).toMatchObject({
		activeVersionId: workflow.versionId,
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

test('publish:workflow reports the service error for a missing version', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

	await expect(
		command.run([`--id=${workflow.id}`, '--versionId=non-existent-version']),
	).rejects.toThrow('Version not found');
});

test('publish:workflow records deactivated and activated by the owner and enqueues a publish', async () => {
	const workflow = await createActiveWorkflow({}, owner);
	const { versionId: nextVersionId } = await createWorkflowHistoryItem(workflow.id, {
		nodes: workflow.nodes,
	});

	await command.run([`--id=${workflow.id}`, `--versionId=${nextVersionId}`]);

	expect(await publishEvents(workflow.id)).toEqual([
		{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
		{ event: 'deactivated', versionId: workflow.versionId, userId: owner.id },
		{ event: 'activated', versionId: nextVersionId, userId: owner.id },
	]);
	const outbox = await Container.get(WorkflowPublicationOutboxRepository).findBy({
		workflowId: workflow.id,
	});
	expect(outbox.map(({ status }) => status)).toEqual([WorkflowPublicationOutboxStatus.Pending]);
});

test('publish:workflow rejects a webhook path that another published workflow holds', async () => {
	const holder = await createActiveWorkflow({}, owner);
	await Container.get(WebhookRepository).insert({
		workflowId: holder.id,
		webhookPath: WEBHOOK_PATH,
		method: 'POST',
		node: webhookNode.name,
	});
	const workflow = await createWorkflowWithHistory({ nodes: [webhookNode] }, owner);

	await expect(command.run([`--id=${workflow.id}`])).rejects.toThrow(
		'There is a conflict with one of the webhooks.',
	);
	expect((await getWorkflowById(workflow.id))?.activeVersionId).toBeNull();
});

describe('with the workflow publication service off in regular mode', () => {
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

	test('publish:workflow refuses a republish with the flag off in regular mode', async () => {
		const workflow = await createActiveWorkflow({}, owner);
		const { versionId: nextVersionId } = await createWorkflowHistoryItem(workflow.id, {
			nodes: workflow.nodes,
		});

		await expect(
			command.run([`--id=${workflow.id}`, `--versionId=${nextVersionId}`]),
		).rejects.toThrow(REPUBLISH_REFUSED);
		expect((await getWorkflowById(workflow.id))?.activeVersionId).toBe(workflow.versionId);
		expect(await publishEvents(workflow.id)).toEqual([
			{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
		]);
	});

	describe('in queue mode', () => {
		let original: { mode: string; multiMain: boolean; cacheBackend: string };

		beforeAll(() => {
			const { executions, multiMainSetup, cache } = Container.get(GlobalConfig);
			original = {
				mode: executions.mode,
				multiMain: multiMainSetup.enabled,
				cacheBackend: cache.backend,
			};
			executions.mode = 'queue';
			multiMainSetup.enabled = false;
			cache.backend = 'memory';
		});

		afterAll(() => {
			const { executions, multiMainSetup, cache } = Container.get(GlobalConfig);
			executions.mode = original.mode as typeof executions.mode;
			multiMainSetup.enabled = original.multiMain;
			cache.backend = original.cacheBackend as typeof cache.backend;
		});

		test('publish:workflow refuses a republish with the flag off in queue mode with one main', async () => {
			const workflow = await createActiveWorkflow({}, owner);
			await Container.get(WebhookRepository).insert({
				workflowId: workflow.id,
				webhookPath: WEBHOOK_PATH,
				method: 'POST',
				node: webhookNode.name,
			});
			const { versionId: nextVersionId } = await createWorkflowHistoryItem(workflow.id, {
				nodes: workflow.nodes,
			});

			await expect(
				command.run([`--id=${workflow.id}`, `--versionId=${nextVersionId}`]),
			).rejects.toThrow(REPUBLISH_REFUSED);
			expect(await Container.get(WebhookRepository).countBy({ workflowId: workflow.id })).toBe(1);
		});

		test('publish:workflow hands a republish to the leader with the flag off in multi-main', async () => {
			Container.get(GlobalConfig).multiMainSetup.enabled = true;
			const workflow = await createActiveWorkflow({}, owner);
			const { versionId: nextVersionId } = await createWorkflowHistoryItem(workflow.id, {
				nodes: workflow.nodes,
			});

			try {
				await command.run([`--id=${workflow.id}`, `--versionId=${nextVersionId}`]);
			} finally {
				Container.get(GlobalConfig).multiMainSetup.enabled = false;
			}

			expect((await getWorkflowById(workflow.id))?.activeVersionId).toBe(nextVersionId);
			expect(publisher.publishCommand).toHaveBeenCalledWith(
				expect.objectContaining({ command: 'add-webhooks-triggers-and-pollers' }),
			);
		});
	});

	test('publish:workflow publishes a never-published workflow with the flag off in regular mode', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

		await command.run([`--id=${workflow.id}`]);

		expect((await getWorkflowById(workflow.id))?.activeVersionId).toBe(workflow.versionId);
		expect(await publishEvents(workflow.id)).toEqual([
			{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
		]);
	});

	test('publish:workflow tells the operator to restart n8n with the flag off in regular mode', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, owner);
		const info = vi.spyOn(Container.get(Logger), 'info');

		await command.run([`--id=${workflow.id}`]);

		expect(info).toHaveBeenCalledWith(RESTART_NOTE);
	});
});

test('publish:workflow tells the operator that a running n8n applies the change', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);
	const info = vi.spyOn(Container.get(Logger), 'info');

	await command.run([`--id=${workflow.id}`]);

	expect(info).toHaveBeenCalledWith(APPLIES_SHORTLY_NOTE);
});
