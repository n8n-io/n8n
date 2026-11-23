/**
 * Drives the real ActiveWorkflowManager, so the republish after a move runs the real
 * `workflowPublish` host point against the project the workflow moved into.
 */
import {
	createActiveWorkflow,
	createTeamProject,
	getWorkflowSharing,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import type { Project, User } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationReason,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowPublishedVersionRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type {
	CredentialDecryptContext,
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
} from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ActiveWorkflowTriggers, InstanceSettings } from 'n8n-core';
import type {
	IHookFunctions,
	INode,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { ExternalHooks, toWorkflowLifecycleHookActor } from '@/external-hooks';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { saveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { createMember, createOwner, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'test-publish-deny';

/** The cron node of the `createActiveWorkflow` fixture. */
const CRON_NODE_ID = 'uuid-2';

/** `${projectId}:${workflowId}` pairs whose publish the check refuses. */
const refusedPublishes = new Set<string>();
/** `${projectId}:${nodeType}` pairs whose publish the check refuses. */
const refusedNodeTypes = new Set<string>();
/** Projects in which the check refuses every credential decryption. */
const refusedDecryptProjects = new Set<string>();

@PolicyCheck()
class PublishDenyCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowPublish({
		workflow,
		projectId,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		const refused =
			refusedPublishes.has(`${projectId}:${workflow.id}`) ||
			workflow.nodes.some((node) => refusedNodeTypes.has(`${projectId}:${node.type}`));
		if (!refused) return { violations: [] };

		return {
			violations: [
				{
					kind: 'test-publish-denied',
					checkId: this.id,
					message: `Publishing is blocked in project ${projectId}`,
					scope: 'project',
					projectId: projectId ?? undefined,
				},
			],
		};
	}

	async onCredentialDecrypt({ projectId }: CredentialDecryptContext): Promise<PolicyCheckResult> {
		if (projectId === null || !refusedDecryptProjects.has(projectId)) return { violations: [] };

		return {
			violations: [
				{
					kind: 'test-decrypt-denied',
					checkId: this.id,
					message: `Decryption is blocked in project ${projectId}`,
					scope: 'project',
					projectId,
				},
			],
		};
	}
}

/** Ids of the workflows whose webhook the fixture deregistered with its credential. */
const deregisteredWebhooks: string[] = [];

class CredentialedWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Credentialed Webhook Trigger',
		name: 'credentialedWebhookTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Deregisters its third-party webhook with a credential',
		defaults: { name: 'Credentialed Webhook Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'githubApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'hook' }],
		properties: [],
	};

	webhookMethods = {
		default: {
			async checkExists(): Promise<boolean> {
				return false;
			},
			async create(): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				await this.getCredentials('githubApi');
				deregisteredWebhooks.push(this.getWorkflow().id ?? '');
				return true;
			},
		},
	};

	async webhook(): Promise<IWebhookResponseData> {
		return {};
	}
}

const externalHooks = mockInstance(ExternalHooks);
mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'folder', 'publicApi'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions', 'feat:folders'],
	modules: ['policy-infrastructure'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

const deactivatedEvents: RelayEventMap['workflow-deactivated'][] = [];

const refusePublish = (projectId: string, workflowId: string) =>
	refusedPublishes.add(`${projectId}:${workflowId}`);

const activeVersionIdOf = async (workflowId: string) =>
	(await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowId })).activeVersionId;

const outboxRecordsOf = async (workflowId: string) =>
	(await Container.get(WorkflowPublicationOutboxRepository).findBy({ workflowId })).map(
		({ status, reason, publishedVersionId }) => ({ status, reason, publishedVersionId }),
	);

const pendingTransfer = (versionId: string) => ({
	status: 'pending',
	reason: 'transfer',
	publishedVersionId: versionId,
});

const pendingReconcile = (versionId: string) => ({
	status: 'pending',
	reason: 'reconcile',
	publishedVersionId: versionId,
});

const registeredCronOf = (workflowId: string) =>
	Container.get(ActiveWorkflowTriggers).get(workflowId)?.get(CRON_NODE_ID);

const ownerProjectIdOf = async (workflowId: string) =>
	(
		await Container.get(SharedWorkflowRepository).findOneByOrFail({
			workflowId,
			role: 'workflow:owner',
		})
	).projectId;

/** Fails only the `transfer` enqueue, so the restore of the refused triggers still runs. */
const failTransferEnqueue = () => {
	const outbox = Container.get(WorkflowPublicationOutboxRepository);
	const enqueue = outbox.enqueueByWorkflowIds.bind(outbox);
	vi.spyOn(outbox, 'enqueueByWorkflowIds').mockImplementation(async (workflowIds, reason, ctx) => {
		if (reason === WorkflowPublicationReason.Transfer) throw new Error('outbox is down');
		return await enqueue(workflowIds, reason, ctx);
	});
};

beforeAll(async () => {
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(PublishDenyCheck);

	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);

	await utils.initNodeTypes({
		...utils.buildDefaultNodes(),
		'n8n-nodes-base.credentialedWebhookTrigger': {
			type: new CredentialedWebhookTrigger(),
			sourcePath: '',
		},
	});
	await utils.initCredentialsTypes();

	Container.get(EventService).on('workflow-deactivated', (event) => {
		deactivatedEvents.push(event);
	});
});

beforeEach(async () => {
	refusedPublishes.clear();
	refusedNodeTypes.clear();
	refusedDecryptProjects.clear();
	deactivatedEvents.length = 0;
	deregisteredWebhooks.length = 0;
	externalHooks.run.mockClear();

	await testDb.truncate([
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublicationTriggerStatus',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Folder',
		'SharedCredentials',
		'CredentialsEntity',
	]);

	sourceProject = await createTeamProject('Source project', member);
	targetProject = await createTeamProject('Target project', member);
});

afterEach(async () => {
	vi.restoreAllMocks();
	// Anything the real manager registers would otherwise stay live for the rest of the worker.
	await Container.get(ActiveWorkflowManager).removeAll();
});

describe('PUT /workflows/:workflowId/transfer', () => {
	test('moves a published workflow and unpublishes it when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({
			unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
		});
		expect(await getWorkflowSharing(workflow)).toEqual([
			expect.objectContaining({ projectId: targetProject.id, role: 'workflow:owner' }),
		]);
		expect(await activeVersionIdOf(workflow.id)).toBeNull();
		await expect(
			Container.get(WorkflowPublishHistoryRepository).findOneBy({
				workflowId: workflow.id,
				event: 'deactivated',
			}),
		).resolves.not.toBeNull();
	});

	test('keeps the workflow published when the destination allows it', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(sourceProject.id, workflow.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body).toEqual({});
		expect(await activeVersionIdOf(workflow.id)).toBe(workflow.versionId);
	});

	test('leaves a pending transfer record that unpublishes a workflow the destination refuses', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(await outboxRecordsOf(workflow.id)).toEqual([pendingTransfer(workflow.versionId)]);
	});

	test('runs the workflow.deactivate hook with the moving user when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(externalHooks.run).toHaveBeenCalledWith('workflow.deactivate', [
			expect.objectContaining({ id: workflow.id }),
			expect.anything(),
			toWorkflowLifecycleHookActor(member),
		]);
	});

	test('emits workflow-deactivated with source ui when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({
				workflowId: workflow.id,
				source: 'ui',
				publicApi: false,
				workflow: expect.objectContaining({ activeVersionId: null }),
			}),
		]);
	});

	test('emits workflow-deactivated with source api and the public API client when a public API move is refused', async () => {
		const owner = await createOwnerWithApiKey();
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await testServer
			.publicApiAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(204);

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({ workflowId: workflow.id, source: 'api', publicApi: 'other' }),
		]);
	});

	test('wakes the leader once after a move the destination refuses', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);
		const requestDrain = vi.spyOn(Container.get(WorkflowPublicationNotifier), 'requestDrain');

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(requestDrain).toHaveBeenCalledTimes(1);
	});

	test('emits no workflow-deactivated event when the unpublish after a refused move fails', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);
		vi.spyOn(Container.get(WorkflowPublishHistoryRepository), 'addRecord').mockRejectedValue(
			new Error('history is down'),
		);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const REPORTED_WITH_A_PENDING_TRANSFER = {
			events: [],
			data: { unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })] },
			records: [pendingTransfer(workflow.versionId)],
		};
		expect({
			events: deactivatedEvents,
			data: response.body.data,
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(REPORTED_WITH_A_PENDING_TRANSFER);
	});

	test('refuses a move on a node type that is only in the published version', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		const draftWithoutCron = workflow.nodes.filter((node) => node.id !== CRON_NODE_ID);
		await Container.get(WorkflowRepository).update(
			{ id: workflow.id },
			{ nodes: draftWithoutCron },
		);
		refusedNodeTypes.add(`${targetProject.id}:n8n-nodes-base.cron`);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(await activeVersionIdOf(workflow.id)).toBeNull();
	});
});

describe('a failed move', () => {
	test('enqueues a reconcile record for a refused workflow that did not move', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);
		vi.spyOn(
			Container.get(EnterpriseWorkflowService) as unknown as {
				transferWorkflowOwnership: () => Promise<void>;
			},
			'transferWorkflowOwnership',
		).mockRejectedValue(new Error('ownership is down'));

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(500);

		const NOT_MOVED_AND_RESTORED = {
			sharing: [expect.objectContaining({ projectId: sourceProject.id, role: 'workflow:owner' })],
			activeVersionId: workflow.versionId,
			records: [pendingReconcile(workflow.versionId)],
		};
		expect({
			sharing: await getWorkflowSharing(workflow),
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOT_MOVED_AND_RESTORED);
	});

	test('rolls back the move and enqueues a reconcile record for a refused workflow when the transfer enqueue fails', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);
		failTransferEnqueue();

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(500);

		const NOT_MOVED_AND_RESTORED = {
			ownerProjectId: sourceProject.id,
			activeVersionId: workflow.versionId,
			records: [pendingReconcile(workflow.versionId)],
		};
		expect({
			ownerProjectId: await ownerProjectIdOf(workflow.id),
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOT_MOVED_AND_RESTORED);
	});

	test('rolls back the move and enqueues a reconcile record for a refused workflow when the move fails after the ownership change', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, shareCredentials: [uuid()] })
			.expect(404);

		const NOT_MOVED_AND_RESTORED = {
			ownerProjectId: sourceProject.id,
			activeVersionId: workflow.versionId,
			records: [pendingReconcile(workflow.versionId)],
		};
		expect({
			ownerProjectId: await ownerProjectIdOf(workflow.id),
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOT_MOVED_AND_RESTORED);
	});

	test('transfers a refused workflow whose webhooks cannot be removed before the transfer', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);
		vi.spyOn(Container.get(ActiveWorkflowManager), 'clearWebhooks').mockRejectedValue(
			new Error('third party is down'),
		);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const TRANSFERRED_AND_UNPUBLISHED = {
			ownerProjectId: targetProject.id,
			activeVersionId: null,
			records: [pendingTransfer(workflow.versionId)],
		};
		expect({
			ownerProjectId: await ownerProjectIdOf(workflow.id),
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(TRANSFERRED_AND_UNPUBLISHED);
	});
});

describe('PUT /projects/:projectId/folders/:folderId/transfer', () => {
	test('unpublishes only the refused workflows and republishes the rest', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const refused = await createActiveWorkflow(
			{ name: 'Refused', parentFolder: folder },
			sourceProject,
		);
		const allowed = await createActiveWorkflow(
			{ name: 'Allowed', parentFolder: folder },
			sourceProject,
		);
		refusePublish(targetProject.id, refused.id);

		const response = await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		expect(response.body.data).toEqual({
			unpublishedWorkflows: [
				{
					id: refused.id,
					name: 'Refused',
					unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
				},
			],
		});
		expect(await activeVersionIdOf(refused.id)).toBeNull();
		expect(await activeVersionIdOf(allowed.id)).toBe(allowed.versionId);
	});

	test('a folder move enqueues a transfer record for allowed and refused workflows', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const refused = await createActiveWorkflow(
			{ name: 'Refused', parentFolder: folder },
			sourceProject,
		);
		const allowed = await createActiveWorkflow(
			{ name: 'Allowed', parentFolder: folder },
			sourceProject,
		);
		refusePublish(targetProject.id, refused.id);
		const refusedBefore = await Container.get(WorkflowRepository).findOneByOrFail({
			id: refused.id,
		});

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		const EXPECTED_RECORDS = [
			{ workflowId: refused.id, records: [pendingTransfer(refused.versionId)] },
			{ workflowId: allowed.id, records: [pendingTransfer(allowed.versionId)] },
		];
		for (const { workflowId, records } of EXPECTED_RECORDS) {
			expect(await outboxRecordsOf(workflowId)).toEqual(records);
		}
		const refusedAfter = await Container.get(WorkflowRepository).findOneByOrFail({
			id: refused.id,
		});
		expect(refusedAfter.updatedAt).toEqual(refusedBefore.updatedAt);
		expect(externalHooks.run).toHaveBeenCalledWith('workflow.deactivate', [
			expect.objectContaining({ id: refused.id, nodes: refused.nodes }),
			expect.anything(),
			expect.anything(),
		]);
	});

	test('a folder move moves nothing and enqueues a reconcile record for the refused workflow when the transfer enqueue fails', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const refused = await createActiveWorkflow(
			{ name: 'Refused', parentFolder: folder },
			sourceProject,
		);
		const allowed = await createActiveWorkflow(
			{ name: 'Allowed', parentFolder: folder },
			sourceProject,
		);
		refusePublish(targetProject.id, refused.id);
		failTransferEnqueue();

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(500);

		const NOT_MOVED = {
			ownerProjectIds: [sourceProject.id, sourceProject.id],
			activeVersionIds: [refused.versionId, allowed.versionId],
			refusedRecords: [pendingReconcile(refused.versionId)],
			allowedRecords: [],
		};
		expect({
			ownerProjectIds: [await ownerProjectIdOf(refused.id), await ownerProjectIdOf(allowed.id)],
			activeVersionIds: [await activeVersionIdOf(refused.id), await activeVersionIdOf(allowed.id)],
			refusedRecords: await outboxRecordsOf(refused.id),
			allowedRecords: await outboxRecordsOf(allowed.id),
		}).toEqual(NOT_MOVED);
	});
});

describe('on the leader', () => {
	beforeEach(() => {
		Container.get(InstanceSettings).markAsLeader();
		// The leader's background drain would re-register the triggers during the assertions.
		vi.spyOn(Container.get(WorkflowPublicationNotifier), 'requestDrain').mockImplementation(
			() => {},
		);
	});

	afterEach(() => {
		Container.get(InstanceSettings).instanceRole = 'unset';
	});

	test('keeps the registered trigger of a workflow the destination allows until the leader applies the transfer record', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		const registeredBefore = registeredCronOf(workflow.id);
		expect(registeredBefore).toBeDefined();

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(registeredCronOf(workflow.id)).toBe(registeredBefore);
	});

	test('removes the in-memory trigger of a refused workflow on the leader, not before the transfer', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);
		const registeredAfterRequest = registeredCronOf(workflow.id) !== undefined;
		const outbox = Container.get(WorkflowPublicationOutboxRepository);
		const transferRecord = await outbox.claimNextPendingRecord();
		await Container.get(WorkflowPublicationOutboxConsumer).processRecord(
			transferRecord!,
			new AbortController().signal,
		);

		const REMOVED_BY_THE_LEADER = { afterRequest: true, afterLeader: false };
		expect({
			afterRequest: registeredAfterRequest,
			afterLeader: registeredCronOf(workflow.id) !== undefined,
		}).toEqual(REMOVED_BY_THE_LEADER);
	});

	test('checks no policy and keeps the triggers for a move inside one project', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const workflow = await createActiveWorkflow({}, sourceProject);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		const registeredBefore = registeredCronOf(workflow.id);
		refusePublish(sourceProject.id, workflow.id);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: sourceProject.id, destinationParentFolderId: folder.id })
			.expect(200);

		const UNCHANGED = {
			body: {},
			activeVersionId: workflow.versionId,
			registeredCron: registeredBefore,
			records: [],
		};
		expect({
			body: response.body,
			activeVersionId: await activeVersionIdOf(workflow.id),
			registeredCron: registeredCronOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(UNCHANGED);
	});

	test('a refused move converges after the leader drains its unpublish record', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		const outbox = Container.get(WorkflowPublicationOutboxRepository);
		const consumer = Container.get(WorkflowPublicationOutboxConsumer);
		const triggerStatuses = Container.get(WorkflowPublicationTriggerStatusRepository);
		const signal = new AbortController().signal;
		await outbox.enqueue(workflow.id, workflow.versionId, 'publish');
		const publishRecord = await outbox.claimNextPendingRecord();
		await consumer.processRecord(publishRecord!, signal);
		expect(await triggerStatuses.findByWorkflowId(workflow.id)).not.toEqual([]);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);
		const unpublishRecord = await outbox.claimNextPendingRecord();
		expect(unpublishRecord?.workflowId).toBe(workflow.id);
		await consumer.processRecord(unpublishRecord!, signal);

		const CONVERGED = { recordStatus: 'completed', publishedVersionId: null, triggerStatuses: [] };
		expect({
			recordStatus: (await outbox.findOneByOrFail({ id: unpublishRecord!.id })).status,
			publishedVersionId: await Container.get(
				WorkflowPublishedVersionRepository,
			).getPublishedVersionId(workflow.id),
			triggerStatuses: await triggerStatuses.findByWorkflowId(workflow.id),
		}).toEqual(CONVERGED);
	});

	test('deregisters the external webhook of a refused move while the workflow is in the source project', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
			role: 'credential:owner',
		});
		const webhookNode: INode = {
			id: 'credentialed-webhook',
			name: 'Credentialed Webhook',
			type: 'n8n-nodes-base.credentialedWebhookTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			webhookId: uuid(),
			credentials: { githubApi: { id: credential.id, name: credential.name } },
		};
		const workflow = await createActiveWorkflow(
			{ nodes: [webhookNode], connections: {} },
			sourceProject,
		);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		refusePublish(targetProject.id, workflow.id);
		refusedDecryptProjects.add(targetProject.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(deregisteredWebhooks).toEqual([workflow.id]);
	});
});
