import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflowHistory,
	createWorkflowWithTriggerAndHistory,
	getPersonalProject,
	getWorkflowSharing,
	mockInstance,
	randomCredentialPayload,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService, WorkflowMutationHooksProxy } from '@n8n/backend-services';
import type { Project, User } from '@n8n/db';
import {
	FolderRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationReason,
	WorkflowPublicationRetryStateRepository,
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
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
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

const ownerProjectIdOf = async (workflowId: string) =>
	(
		await Container.get(SharedWorkflowRepository).findOneByOrFail({
			workflowId,
			role: 'workflow:owner',
		})
	).projectId;

const parentFolderIdOf = async (workflowId: string) =>
	(
		await Container.get(WorkflowRepository).findOneOrFail({
			where: { id: workflowId },
			relations: { parentFolder: true },
		})
	).parentFolder?.id ?? null;

const folderProjectIdOf = async (folderId: string) =>
	(
		await Container.get(FolderRepository).findOneOrFail({
			where: { id: folderId },
			relations: { homeProject: true },
		})
	).homeProject.id;

const isSharedWith = async (credentialId: string, project: Project) =>
	await Container.get(SharedCredentialsRepository).existsBy({
		credentialsId: credentialId,
		projectId: project.id,
	});

const saveCredentialHeldBy = async (holder: Project) =>
	await saveCredential(randomCredentialPayload(), { project: holder, role: 'credential:owner' });

/** Adds to the version a node with a credential that only the given project holds. */
const addCredentialOnlyHeldBy = async (versionId: string, holder: Project) => {
	const credential = await saveCredentialHeldBy(holder);
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
	return credential;
};

const addCredentialOnlySourceHolds = async (versionId: string) =>
	await addCredentialOnlyHeldBy(versionId, sourceProject);

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
		'WorkflowPublicationRetryState',
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

	test('fails the move and changes nothing when the transfer enqueue fails', async () => {
		const destinationFolder = await createFolder(targetProject, { name: 'Destination' });
		const workflow = await createActiveWorkflow({}, sourceProject);
		const credential = await saveCredentialHeldBy(sourceProject);
		failTransferEnqueue();

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: targetProject.id,
				destinationParentFolderId: destinationFolder.id,
				shareCredentials: [credential.id],
			})
			.expect(500);

		const NOTHING_CHANGED = {
			ownerProjectId: sourceProject.id,
			parentFolderId: null,
			credentialSharedWithTarget: false,
			activeVersionId: workflow.versionId,
			records: [],
		};
		expect({
			ownerProjectId: await ownerProjectIdOf(workflow.id),
			parentFolderId: await parentFolderIdOf(workflow.id),
			credentialSharedWithTarget: await isSharedWith(credential.id, targetProject),
			activeVersionId: await activeVersionIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOTHING_CHANGED);
	});

	test('rolls back the move when it fails after the ownership change', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, sourceProject);

		await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, shareCredentials: [uuid()] })
			.expect(404);

		const ROLLED_BACK = { ownerProjectId: sourceProject.id, records: [] };
		expect({
			ownerProjectId: await ownerProjectIdOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(ROLLED_BACK);
	});

	test('enqueues a transfer record for a workflow published after the read before the move', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, sourceProject);
		const workflows = Container.get(WorkflowRepository);
		const read = workflows.findWithActiveVersionByIds.bind(workflows);
		vi.spyOn(workflows, 'findWithActiveVersionByIds').mockImplementationOnce(
			async (workflowIds) => {
				const published = await read(workflowIds);
				await setActiveVersion(workflow.id, workflow.versionId);
				return published;
			},
		);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		expect(await outboxRecordsOf(workflow.id)).toEqual([pendingTransfer(workflow.versionId)]);
	});

	test('enqueues no record and runs no check for a move inside one project', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const workflow = await createActiveWorkflow({}, sourceProject);
		const checkCredentials = vi.spyOn(
			Container.get(ActiveWorkflowManager),
			'checkTriggerCredentialAccess',
		);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: sourceProject.id, destinationParentFolderId: folder.id })
			.expect(200);

		const NO_REPUBLISH = { records: [], checks: 0 };
		expect({
			records: await outboxRecordsOf(workflow.id),
			checks: checkCredentials.mock.calls.length,
		}).toEqual(NO_REPUBLISH);
	});

	test('allows a move whose credential the move shares', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		const credential = await addCredentialOnlySourceHolds(workflow.versionId);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, shareCredentials: [credential.id] })
			.expect(200);

		const MOVED_AND_PUBLISHED = { body: {}, records: [pendingTransfer(workflow.versionId)] };
		expect({
			body: response.body,
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(MOVED_AND_PUBLISHED);
	});

	test('checks the owner from the database after the commit', async () => {
		const owner = await createOwner();
		const ownerPersonalProject = await getPersonalProject(owner);
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlyHeldBy(workflow.versionId, await createTeamProject('Other project'));
		const ownership = Container.get(OwnershipService);
		await ownership.getWorkflowProjectCached(workflow.id);
		vi.spyOn(ownership, 'setWorkflowProjectCacheEntry').mockResolvedValue(sourceProject);

		const response = await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: ownerPersonalProject.id })
			.expect(200);

		const MOVED_AND_PUBLISHED = { body: {}, activeVersionId: workflow.versionId };
		expect({
			body: response.body,
			activeVersionId: await activeVersionIdOf(workflow.id),
		}).toEqual(MOVED_AND_PUBLISHED);
	});

	test('still unpublishes a refused workflow when afterWorkflowsTransferred throws', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);
		vi.spyOn(
			Container.get(WorkflowMutationHooksProxy),
			'afterWorkflowsTransferred',
		).mockRejectedValue(new Error('hooks are down'));

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(500);

		const UNPUBLISHED = {
			activeVersionId: null,
			events: [expect.objectContaining({ workflowId: workflow.id })],
		};
		expect({
			activeVersionId: await activeVersionIdOf(workflow.id),
			events: deactivatedEvents,
		}).toEqual(UNPUBLISHED);
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
			records: [pendingTransfer(workflow.versionId)],
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
			records: [pendingTransfer(workflow.versionId)],
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
			records: [pendingTransfer(workflow.versionId)],
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
			Container.get(WorkflowMutationHooksProxy),
			'afterWorkflowsTransferred',
		).mockImplementation(async () => {
			await createWorkflowHistory({ ...workflow, versionId: republishedVersionId }, sourceProject);
			await setActiveVersion(workflow.id, republishedVersionId);
			await Container.get(WorkflowPublicationOutboxRepository).enqueue(
				workflow.id,
				republishedVersionId,
				WorkflowPublicationReason.Publish,
			);
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

	test('emits workflow-deactivated with source api and the public API client when a public API move is refused', async () => {
		const owner = await createOwnerWithApiKey();
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);

		await testServer
			.publicApiAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(204);

		expect(deactivatedEvents).toEqual([
			expect.objectContaining({ workflowId: workflow.id, source: 'api', publicApi: 'other' }),
		]);
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

	test('moves no workflow and no folder when the transfer enqueue fails', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const childFolder = await createFolder(sourceProject, { name: 'Child', parentFolder: folder });
		const workflow = await createActiveWorkflow({ parentFolder: childFolder }, sourceProject);
		failTransferEnqueue();

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(500);

		const NOTHING_MOVED = {
			workflowProjectId: sourceProject.id,
			folderProjectIds: [sourceProject.id, sourceProject.id],
			records: [],
		};
		expect({
			workflowProjectId: await ownerProjectIdOf(workflow.id),
			folderProjectIds: [
				await folderProjectIdOf(folder.id),
				await folderProjectIdOf(childFolder.id),
			],
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(NOTHING_MOVED);
	});

	test('enqueues no record for an unpublished workflow of a folder move', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const workflow = await createWorkflowWithTriggerAndHistory(
			{ parentFolder: folder },
			sourceProject,
		);

		await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		expect(await outboxRecordsOf(workflow.id)).toEqual([]);
	});

	test('unpublishes only the refused workflow of a folder move and keeps the transfer reason of both records', async () => {
		const folder = await createFolder(sourceProject, { name: 'Folder' });
		const refused = await createActiveWorkflow(
			{ name: 'Refused', parentFolder: folder },
			sourceProject,
		);
		const allowed = await createActiveWorkflow(
			{ name: 'Allowed', parentFolder: folder },
			sourceProject,
		);
		await addCredentialOnlySourceHolds(refused.versionId);

		const response = await authMemberAgent
			.put(`/projects/${sourceProject.id}/folders/${folder.id}/transfer`)
			.send({ destinationProjectId: targetProject.id, destinationParentFolderId: '0' })
			.expect(200);

		const REFUSED_ONE_ALLOWED_ONE = {
			unpublishedWorkflows: [
				{
					id: refused.id,
					name: 'Refused',
					error: expect.objectContaining({ name: 'TriggerCredentialAccessError' }),
				},
			],
			refusedRecords: [pendingTransfer(refused.versionId)],
			allowedRecords: [pendingTransfer(allowed.versionId)],
		};
		expect({
			unpublishedWorkflows: response.body.data.unpublishedWorkflows,
			refusedRecords: await outboxRecordsOf(refused.id),
			allowedRecords: await outboxRecordsOf(allowed.id),
		}).toEqual(REFUSED_ONE_ALLOWED_ONE);
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

	test('retries a failed transfer record when an earlier failure suppressed the retry of the same version', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		const retryStates = Container.get(WorkflowPublicationRetryStateRepository);
		await retryStates.suppressRetry(workflow.id, workflow.versionId);

		await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);
		vi.spyOn(
			Container.get(WorkflowPublisherService),
			'findPublisherUserIdForAccessCheck',
		).mockRejectedValueOnce(new Error('publishers are down'));
		const record = await Container.get(
			WorkflowPublicationOutboxRepository,
		).claimNextPendingRecord();
		await Container.get(WorkflowPublicationOutboxConsumer).processRecord(
			record!,
			new AbortController().signal,
		);

		const FIRST_RETRY_DELAY_SECONDS = 60;
		expect((await retryStates.findOneByOrFail({ workflowId: workflow.id })).retryDelaySeconds).toBe(
			FIRST_RETRY_DELAY_SECONDS,
		);
	});

	test('leaves a pending transfer record when the unpublish of a refused workflow fails', async () => {
		const workflow = await createActiveWorkflow({}, sourceProject);
		await addCredentialOnlySourceHolds(workflow.versionId);
		await Container.get(ActiveWorkflowManager).add(workflow.id, 'activate');
		const registeredBefore = registeredCronOf(workflow.id);
		vi.spyOn(Container.get(WorkflowPublishHistoryRepository), 'addRecord').mockRejectedValue(
			new Error('history is down'),
		);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: targetProject.id })
			.expect(200);

		const AFTER_THE_REQUEST = {
			error: expect.objectContaining({ name: 'TriggerCredentialAccessError' }),
			activeVersionId: workflow.versionId,
			registeredCron: registeredBefore,
			records: [pendingTransfer(workflow.versionId)],
		};
		expect({
			error: response.body.data?.error,
			activeVersionId: await activeVersionIdOf(workflow.id),
			registeredCron: registeredCronOf(workflow.id),
			records: await outboxRecordsOf(workflow.id),
		}).toEqual(AFTER_THE_REQUEST);

		const outbox = Container.get(WorkflowPublicationOutboxRepository);
		const record = await outbox.claimNextPendingRecord();
		await Container.get(WorkflowPublicationOutboxConsumer).processRecord(
			record!,
			new AbortController().signal,
		);

		const AFTER_THE_APPLY = { registeredCron: undefined, recordStatuses: ['failed'] };
		expect({
			registeredCron: registeredCronOf(workflow.id),
			recordStatuses: (await outboxRecordsOf(workflow.id)).map(({ status }) => status),
		}).toEqual(AFTER_THE_APPLY);
	});
});
