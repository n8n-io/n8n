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
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { Project, User } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowPublicationOutboxRepository,
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

const pendingUnpublish = (versionId: string) => ({
	status: 'pending',
	reason: 'publish',
	publishedVersionId: versionId,
});

const pendingTransfer = (versionId: string) => ({
	status: 'pending',
	reason: 'transfer',
	publishedVersionId: versionId,
});

const registeredCronOf = (workflowId: string) =>
	Container.get(ActiveWorkflowTriggers).get(workflowId)?.get(CRON_NODE_ID);

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

	test('enqueues an unpublish record when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(await outboxRecordsOf(workflow.id)).toEqual([pendingUnpublish(workflow.versionId)]);
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

	test('emits workflow-deactivated with source transfer when the destination refuses the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({
				workflowId: workflow.id,
				source: 'transfer',
				publicApi: false,
				workflow: expect.objectContaining({ activeVersionId: null }),
			}),
		]);
	});

	test('emits workflow-deactivated with publicApi true when a public API move is refused', async () => {
		const owner = await createOwnerWithApiKey();
		const workflow = await createActiveWorkflow({}, sourceProject);
		refusePublish(targetProject.id, workflow.id);

		await testServer
			.publicApiAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id });

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({ workflowId: workflow.id, source: 'transfer', publicApi: true }),
		]);
	});

	test('enqueues a transfer record for the active version when the destination allows the publish', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(await outboxRecordsOf(workflow.id)).toEqual([pendingTransfer(workflow.versionId)]);
	});

	const WAKES_PER_MOVE = [
		{ outcome: 'allows', refused: false },
		{ outcome: 'refuses', refused: true },
	];
	test.each(WAKES_PER_MOVE)(
		'wakes the leader once after a move the destination $outcome',
		async ({ refused }) => {
			const workflow = await createActiveWorkflow({}, sourceProject);
			if (refused) refusePublish(targetProject.id, workflow.id);
			const requestDrain = vi.spyOn(Container.get(WorkflowPublicationNotifier), 'requestDrain');

			await authMemberAgent
				.put(`/workflows/${workflow.id}/transfer`)
				.send({ destinationProjectId: targetProject.id })
				.expect(200);

			expect(requestDrain).toHaveBeenCalledTimes(1);
		},
	);

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

		expect(deactivatedEvents).toEqual([]);
		expect(response.body.data).toEqual({
			unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
		});
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

	test('a move that fails after the ownership change still enqueues the transfer record', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, sourceProject);

		await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, shareCredentials: [uuid()] })
			.expect(404);

		const AFTER_FAILED_MOVE = {
			sharing: [expect.objectContaining({ projectId: targetProject.id, role: 'workflow:owner' })],
			records: [pendingTransfer(workflow.versionId)],
		};
		expect({
			sharing: await getWorkflowSharing(workflow),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(AFTER_FAILED_MOVE);
	});
});

describe('a move that fails after the ownership change', () => {
	test('reports the error of the move when reading the new owners also fails', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, sourceProject);
		vi.spyOn(
			Container.get(SharedWorkflowRepository),
			'findOwnerProjectsByWorkflowIds',
		).mockRejectedValue(new Error('owners are down'));

		await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, shareCredentials: [uuid()] })
			.expect(404);
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

	test('a folder move enqueues a transfer record for allowed workflows and an unpublish record for refused ones', async () => {
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
			{ workflowId: refused.id, records: [pendingUnpublish(refused.versionId)] },
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

	test('a folder move reports every allowed workflow as failed when the transfer enqueue fails', async () => {
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
		vi.spyOn(
			Container.get(WorkflowPublicationOutboxRepository),
			'enqueueByWorkflowIds',
		).mockRejectedValue(new Error('outbox is down'));
		const logError = vi.spyOn(Container.get(Logger), 'error');

		const response = await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		const EXPECTED_UNPUBLISHED = [
			{
				id: refused.id,
				name: 'Refused',
				unpublishReasons: [expect.objectContaining({ checkId: CHECK_ID })],
			},
			{ id: allowed.id, name: 'Allowed', error: { name: 'Error', message: 'outbox is down' } },
		];
		expect(response.body.data.unpublishedWorkflows).toEqual(
			expect.arrayContaining(EXPECTED_UNPUBLISHED),
		);
		expect(response.body.data.unpublishedWorkflows).toHaveLength(EXPECTED_UNPUBLISHED.length);
		expect(await activeVersionIdOf(allowed.id)).toBeNull();
		expect(logError).toHaveBeenCalledTimes(1);
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

	test('keeps the registered trigger of a moved workflow until the leader applies the transfer record', async () => {
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

	test("keeps the registered triggers of a moved folder's workflows until the leader applies the transfer records", async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const workflow = await createActiveWorkflow({ parentFolder: folder }, sourceProject);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		const registeredBefore = registeredCronOf(workflow.id);
		expect(registeredBefore).toBeDefined();

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		expect(registeredCronOf(workflow.id)).toBe(registeredBefore);
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
