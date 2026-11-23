import { ModuleRegistry } from '@n8n/backend-common';
import {
	createActiveWorkflow,
	createTeamProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import type { Project, WorkflowEntity } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationReason,
	WorkflowPublicationRetryStateRepository,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import type {
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ActiveWorkflowTriggers, ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import type { INode, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

import { saveCredential } from '../shared/db/credentials';
import * as utils from '../shared/utils/';

/** The cron node of the `createActiveWorkflow` fixture, which also has a manual trigger. */
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

/** Project ids in which the publish policy refuses every workflow. */
const projectsThatRefusePublish = new Set<string>();

@PolicyCheck()
export class RefusePublishInProjectCheck implements RegisteredPolicyCheck {
	readonly id = 'test-refuse-publish-in-project';

	async onWorkflowPublish({ projectId }: WorkflowPublishContext): Promise<PolicyCheckResult> {
		if (projectId === null || !projectsThatRefusePublish.has(projectId)) return { violations: [] };

		return {
			violations: [
				{
					kind: 'test-publish-refused',
					checkId: this.id,
					message: `Publishing is refused in project ${projectId}`,
					scope: 'project',
					projectId,
				},
			],
		};
	}
}

mockInstance(ActiveExecutions);
mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(ExternalHooks);
mockInstance(Telemetry);

let sourceProject: Project;
let targetProject: Project;
let originalUseWorkflowPublicationService: boolean;

const outboxRepository = () => Container.get(WorkflowPublicationOutboxRepository);

const registeredCronOf = (workflowId: string) =>
	Container.get(ActiveWorkflowTriggers).get(workflowId)?.get(CRON_NODE_ID);

const triggerStatusesOf = async (workflowId: string) =>
	(
		await Container.get(WorkflowPublicationTriggerStatusRepository).findByWorkflowId(workflowId)
	).map(({ status }) => status);

const retryDelaySecondsOf = async (workflowId: string) =>
	(await Container.get(WorkflowPublicationRetryStateRepository).findOneByOrFail({ workflowId }))
		.retryDelaySeconds;

const recordStatusesOf = async (workflowId: string) =>
	(await outboxRepository().findBy({ workflowId }))
		.sort((a, b) => a.id - b.id)
		.map(({ reason, status }) => ({ reason, status }));

/** Enqueues a record for the workflow and applies it on this leader. */
const applyRecord = async (
	workflowId: string,
	versionId: string,
	reason: WorkflowPublicationReason,
): Promise<void> => {
	await outboxRepository().enqueue(workflowId, versionId, reason);
	const record = await outboxRepository().claimNextPendingRecord();
	await Container.get(WorkflowPublicationOutboxConsumer).processRecord(
		record!,
		new AbortController().signal,
	);
};

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

/** A workflow whose triggers run on this leader in the source project, with `activated` status rows. */
const runningInSource = async (
	{ withCredentialOnlySourceHolds } = { withCredentialOnlySourceHolds: false },
): Promise<WorkflowEntity> => {
	const workflow = await createActiveWorkflow({}, sourceProject);
	if (withCredentialOnlySourceHolds) await addCredentialOnlySourceHolds(workflow.versionId);
	await applyRecord(workflow.id, workflow.versionId, WorkflowPublicationReason.Publish);
	return workflow;
};

/** Moves the owner to the target project in the database, as a transfer commits it. */
const moveToTarget = async (workflowId: string) =>
	await Container.get(SharedWorkflowRepository).update(
		{ workflowId, role: 'workflow:owner' },
		{ projectId: targetProject.id },
	);

beforeAll(async () => {
	await testModules.loadModules(['policy-infrastructure']);
	await testDb.init();
	await Container.get(ModuleRegistry).initModules('main');

	await utils.initNodeTypes({
		...utils.buildDefaultNodes(),
		'n8n-nodes-base.credentialedNode': { type: new CredentialedNode(), sourcePath: '' },
	});
	await utils.initCredentialsTypes();

	Container.get(InstanceSettings).markAsLeader();
	const workflowsConfig = Container.get(WorkflowsConfig);
	originalUseWorkflowPublicationService = workflowsConfig.useWorkflowPublicationService;
	workflowsConfig.useWorkflowPublicationService = true;
});

beforeEach(async () => {
	sourceProject = await createTeamProject('Source project');
	targetProject = await createTeamProject('Target project');
});

afterEach(async () => {
	projectsThatRefusePublish.clear();
	vi.restoreAllMocks();
	await Container.get(ActiveWorkflowManager).removeAll();
	await testDb.truncate([
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublicationTriggerStatus',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'SharedCredentials',
		'CredentialsEntity',
		'Project',
	]);
});

afterAll(async () => {
	Container.get(WorkflowsConfig).useWorkflowPublicationService =
		originalUseWorkflowPublicationService;
	await testDb.terminate();
});

describe('a transfer record on the leader', () => {
	test('removes the old triggers of a transfer record and schedules a retry when the leader cannot look up the publisher', async () => {
		const workflow = await runningInSource();
		await moveToTarget(workflow.id);
		vi.spyOn(
			Container.get(WorkflowPublisherService),
			'findPublisherUserIdForAccessCheck',
		).mockRejectedValueOnce(new Error('db blip'));

		await applyRecord(workflow.id, workflow.versionId, WorkflowPublicationReason.Transfer);

		const FAILED_CLOSED_WITH_RETRY = {
			cronRegistered: false,
			triggerStatuses: ['failed', 'failed'],
			retryDelaySeconds: 60,
		};
		expect({
			cronRegistered: registeredCronOf(workflow.id) !== undefined,
			triggerStatuses: await triggerStatusesOf(workflow.id),
			retryDelaySeconds: await retryDelaySecondsOf(workflow.id),
		}).toEqual(FAILED_CLOSED_WITH_RETRY);
	});

	test('removes the old triggers of a transfer record when the leader refuses its credential', async () => {
		const workflow = await runningInSource({ withCredentialOnlySourceHolds: true });
		await moveToTarget(workflow.id);
		await Container.get(OwnershipService).setWorkflowProjectCacheEntry(workflow.id, targetProject);

		await applyRecord(workflow.id, workflow.versionId, WorkflowPublicationReason.Transfer);

		const REFUSED_WITH_NO_TRIGGERS = {
			cronRegistered: false,
			transferRecord: { reason: 'transfer', status: 'failed' },
		};
		expect({
			cronRegistered: registeredCronOf(workflow.id) !== undefined,
			transferRecord: (await recordStatusesOf(workflow.id))[1],
		}).toEqual(REFUSED_WITH_NO_TRIGGERS);
	});

	test('removes the old triggers of a transfer record whose version is missing, with no retry', async () => {
		const workflow = await runningInSource();
		await moveToTarget(workflow.id);

		await applyRecord(workflow.id, uuid(), WorkflowPublicationReason.Transfer);

		const FAILED_CLOSED_WITHOUT_RETRY = {
			cronRegistered: false,
			triggerStatuses: ['failed', 'failed'],
			retryDelaySeconds: null,
		};
		expect({
			cronRegistered: registeredCronOf(workflow.id) !== undefined,
			triggerStatuses: await triggerStatusesOf(workflow.id),
			retryDelaySeconds: await retryDelaySecondsOf(workflow.id),
		}).toEqual(FAILED_CLOSED_WITHOUT_RETRY);
	});

	test.each([WorkflowPublicationReason.Transfer, WorkflowPublicationReason.Startup])(
		'checks the publish policy in the owner project from the database when the cache entry is stale, for a %s record',
		async (reason) => {
			const workflow = await runningInSource();
			await moveToTarget(workflow.id);
			await Container.get(OwnershipService).setWorkflowProjectCacheEntry(
				workflow.id,
				sourceProject,
			);
			projectsThatRefusePublish.add(targetProject.id);

			await applyRecord(workflow.id, workflow.versionId, reason);

			expect((await recordStatusesOf(workflow.id))[1]).toEqual({ reason, status: 'failed' });
		},
	);
});
