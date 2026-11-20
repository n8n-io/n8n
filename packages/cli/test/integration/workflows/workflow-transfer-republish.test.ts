import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflowHistory,
	getWorkflowSharing,
	mockInstance,
	randomCredentialPayload,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { Project, User } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ActiveWorkflowTriggers, InstanceSettings } from 'n8n-core';
import type { INode, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { ExternalHooks, toWorkflowLifecycleHookActor } from '@/external-hooks';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

import { saveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { createMember, createOwner, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/** The cron node of the `createActiveWorkflow` fixture. */
const CRON_NODE_ID = 'uuid-2';

class CredentialedNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Credentialed Node',
		name: 'credentialedNode',
		group: ['transform'],
		version: 1,
		description: 'Uses a credential',
		defaults: { name: 'Credentialed Node' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'githubApi', required: true }],
		properties: [],
	};
}

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'folder', 'publicApi'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions', 'feat:folders'],
});

let member: User;
let authMemberAgent: SuperAgentTest;
let sourceProject: Project;
let targetProject: Project;

const deactivatedEvents: RelayEventMap['workflow-deactivated'][] = [];

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

const registeredCronOf = (workflowId: string) =>
	Container.get(ActiveWorkflowTriggers).get(workflowId)?.get(CRON_NODE_ID);

/** Adds to the version a node with a credential that only the source project holds. */
const addCredentialOnlySourceHolds = async (versionId: string) => {
	const credential = await saveCredential(randomCredentialPayload(), {
		project: sourceProject,
		role: 'credential:owner',
	});
	const credentialedNode: INode = {
		id: 'credentialed-node',
		name: 'Credentialed Node',
		type: 'n8n-nodes-base.credentialedNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { githubApi: { id: credential.id, name: credential.name } },
	};
	const history = Container.get(WorkflowHistoryRepository);
	const { nodes } = await history.findOneByOrFail({ versionId });
	await history.update({ versionId }, { nodes: [...nodes, credentialedNode] });
};

const failTransferEnqueue = () =>
	vi
		.spyOn(Container.get(WorkflowPublicationOutboxRepository), 'enqueueByWorkflowIds')
		.mockRejectedValue(new Error('outbox is down'));

beforeAll(async () => {
	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);

	await utils.initNodeTypes({
		...utils.buildDefaultNodes(),
		'n8n-nodes-base.credentialedNode': { type: new CredentialedNode(), sourcePath: '' },
	});
	await utils.initCredentialsTypes();

	Container.get(EventService).on('workflow-deactivated', (event) => {
		deactivatedEvents.push(event);
	});
});

beforeEach(async () => {
	deactivatedEvents.length = 0;

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
	await Container.get(ActiveWorkflowManager).removeAll();
});

describe('PUT /workflows/:workflowId/transfer', () => {
	test('keeps the workflow published and enqueues a transfer record for its active version', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const MOVED_AND_PUBLISHED = {
			body: {},
			activeVersionId: workflow.versionId,
			records: [pendingTransfer(workflow.versionId)],
		};
		expect({
			body: response.body,
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(MOVED_AND_PUBLISHED);
	});

	test('wakes the leader once after a move', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		const requestDrain = vi.spyOn(Container.get(WorkflowPublicationNotifier), 'requestDrain');

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(requestDrain).toHaveBeenCalledTimes(1);
	});

	test('unpublishes the workflow and emits workflow-deactivated with source ui when the transfer enqueue fails', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		failTransferEnqueue();

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({ error: { name: 'Error', message: 'outbox is down' } });
		expect(await activeVersionIdOf(workflow.id)).toBeNull();
		expect(deactivatedEvents).toEqual([
			expect.objectContaining({ workflowId: workflow.id, source: 'ui', publicApi: false }),
		]);
	});

	test('reports the error of the transfer enqueue when the unpublish after it also fails', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		failTransferEnqueue();
		vi.spyOn(Container.get(WorkflowPublishHistoryRepository), 'addRecord').mockRejectedValue(
			new Error('history is down'),
		);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(response.body.data).toEqual({ error: { name: 'Error', message: 'outbox is down' } });
	});

	test('unpublishes the workflow and reports the error when the destination cannot use its credential', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const UNPUBLISHED_AND_REPORTED = {
			error: expect.objectContaining({ name: 'TriggerCredentialAccessError' }),
			activeVersionId: null,
			records: [{ status: 'pending', reason: 'publish', publishedVersionId: workflow.versionId }],
		};
		expect({
			error: response.body.data?.error,
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(UNPUBLISHED_AND_REPORTED);
	});

	test('runs the workflow.deactivate hook with the moving user when the destination cannot use its credential', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);
		const runHook = vi.spyOn(Container.get(ExternalHooks), 'run');

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(runHook).toHaveBeenCalledWith('workflow.deactivate', [
			expect.objectContaining({ id: workflow.id }),
			expect.anything(),
			toWorkflowLifecycleHookActor(member),
		]);
	});

	test('unpublishes the workflow and reports the error when its credential check fails for another reason', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		vi.spyOn(
			Container.get(WorkflowPublisherService),
			'findPublisherUserIdForAccessCheck',
		).mockRejectedValue(new Error('publishers are down'));

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const UNPUBLISHED_AND_REPORTED = {
			error: expect.objectContaining({ name: 'PublisherLookupError' }),
			activeVersionId: null,
			records: [{ status: 'pending', reason: 'publish', publishedVersionId: workflow.versionId }],
		};
		expect({
			error: response.body.data?.error,
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(UNPUBLISHED_AND_REPORTED);
	});

	test('fails the move and leaves the workflow in its project when the workflows cannot be read before the move', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		vi.spyOn(Container.get(WorkflowRepository), 'findWithActiveVersionByIds').mockRejectedValueOnce(
			new Error('workflows are down'),
		);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(500);

		const NOT_MOVED = {
			sharing: [expect.objectContaining({ projectId: sourceProject.id, role: 'workflow:owner' })],
			records: [],
		};
		expect({
			sharing: await getWorkflowSharing(workflow),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOT_MOVED);
	});

	test('checks the credentials of the version read before the move when the workflows cannot be read after it', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);
		const workflows = Container.get(WorkflowRepository);
		const read = workflows.findWithActiveVersionByIds.bind(workflows);
		vi.spyOn(workflows, 'findWithActiveVersionByIds').mockImplementation(async (workflowIds) => {
			const owners =
				await Container.get(SharedWorkflowRepository).findOwnerProjectsByWorkflowIds(workflowIds);
			if (owners.get(workflow.id)?.id === targetProject.id) throw new Error('workflows are down');
			return await read(workflowIds);
		});

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const UNPUBLISHED_AND_REPORTED = {
			error: expect.objectContaining({ name: 'TriggerCredentialAccessError' }),
			activeVersionId: null,
			records: [{ status: 'pending', reason: 'publish', publishedVersionId: workflow.versionId }],
		};
		expect({
			error: response.body.data?.error,
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(UNPUBLISHED_AND_REPORTED);
	});

	test('checks the credentials of the version that is published when the move ends', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);
		const republishedVersionId = uuid();
		vi.spyOn(
			Container.get(EnterpriseWorkflowService) as unknown as {
				shareCredentialsWithProject: () => Promise<void>;
			},
			'shareCredentialsWithProject',
		).mockImplementation(async () => {
			await createWorkflowHistory({ ...workflow, versionId: republishedVersionId }, sourceProject);
			await setActiveVersion(workflow.id, republishedVersionId);
		});

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const REPUBLISHED = {
			body: {},
			activeVersionId: republishedVersionId,
			records: [pendingTransfer(republishedVersionId)],
		};
		expect({
			body: response.body,
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(REPUBLISHED);
	});

	test('emits workflow-deactivated with source api and the public API client when the transfer enqueue of a public API move fails', async () => {
		const owner = await createOwnerWithApiKey();
		const workflow = await createActiveWorkflow({}, sourceProject);
		failTransferEnqueue();

		await testServer
			.publicApiAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(204);

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({ workflowId: workflow.id, source: 'api', publicApi: 'other' }),
		]);
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

	test('a move that fails before the ownership change enqueues no record', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
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

		expect(await outboxRecordsOf(workflow.id)).toEqual([]);
	});

	test('reports the error of the move and enqueues the transfer record when reading the new owners also fails', async () => {
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

		expect(await outboxRecordsOf(workflow.id)).toEqual([pendingTransfer(workflow.versionId)]);
	});
});

describe('PUT /projects/:projectId/folders/:folderId/transfer', () => {
	test('enqueues a transfer record for each published workflow of the folder', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const first = await createActiveWorkflow({ parentFolder: folder }, sourceProject);
		const second = await createActiveWorkflow({ parentFolder: folder }, sourceProject);

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		for (const workflow of [first, second]) {
			expect(await outboxRecordsOf(workflow.id)).toEqual([pendingTransfer(workflow.versionId)]);
		}
	});

	test('reports every published workflow as unpublished when the transfer enqueue fails', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const first = await createActiveWorkflow(
			{ name: 'First', parentFolder: folder },
			sourceProject,
		);
		const second = await createActiveWorkflow(
			{ name: 'Second', parentFolder: folder },
			sourceProject,
		);
		failTransferEnqueue();
		const logError = vi.mocked(Container.get(Logger).error);
		logError.mockClear();

		const response = await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		const OUTBOX_DOWN = { name: 'Error', message: 'outbox is down' };
		const EXPECTED_UNPUBLISHED = [
			{ id: first.id, name: 'First', error: OUTBOX_DOWN },
			{ id: second.id, name: 'Second', error: OUTBOX_DOWN },
		];
		expect(response.body.data.unpublishedWorkflows).toEqual(
			expect.arrayContaining(EXPECTED_UNPUBLISHED),
		);
		expect(response.body.data.unpublishedWorkflows).toHaveLength(EXPECTED_UNPUBLISHED.length);
		for (const workflow of [first, second]) {
			expect(await activeVersionIdOf(workflow.id)).toBeNull();
		}
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
});
