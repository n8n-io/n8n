import { LicenseState } from '@n8n/backend-common';
import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { ExternalSecretsProxy, InstanceSettings } from 'n8n-core';
import { MicrosoftOAuth2Api } from 'n8n-nodes-base/credentials/MicrosoftOAuth2Api.credentials';
import { MicrosoftTeamsOAuth2Api } from 'n8n-nodes-base/credentials/MicrosoftTeamsOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/credentials/OAuth2Api.credentials';
import { MicrosoftTeamsTrigger } from 'n8n-nodes-base/nodes/Microsoft/Teams/MicrosoftTeamsTrigger.node';
import type { INode, INodeTypeData } from 'n8n-workflow';
import nock from 'nock';
import { v4 as uuid } from 'uuid';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ExecutionService } from '@/executions/execution.service';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import { OwnershipService } from '@/services/ownership.service';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import { LicenseMocker } from '../shared/license';
import * as utils from '../shared/utils/';

/**
 * ENT-497: a Microsoft Teams Trigger whose Graph subscription is refused (403)
 * on `POST /subscriptions`. The node throws on both activation paths; what
 * differs is where the failure is recorded. The legacy path rejects the
 * activation and registers the error at `GET /rest/active-workflows/error/:id`.
 * The publication path (the default) keeps the workflow `active`, records the
 * failure as a trigger status plus a push, and never writes the legacy store.
 */

mockInstance(ActiveExecutions);
const push = mockInstance(Push);
mockInstance(ExternalSecretsProxy);
mockInstance(ExecutionService);
mockInstance(WorkflowService);
mockInstance(OwnershipService);
mockInstance(ExternalHooks);
mockInstance(Telemetry);

const GRAPH = 'https://graph.microsoft.com';
const TEAM_ID = '61165b04-e4cc-4026-b43f-926b4e2a7182';
const GRAPH_ERROR = 'Operation: Create; Exception: [Status Code: Forbidden; Reason: Forbidden]';

let consumer: WorkflowPublicationOutboxConsumer;
let activeWorkflowManager: ActiveWorkflowManager;
let outboxRepository: WorkflowPublicationOutboxRepository;
let workflowRepository: WorkflowRepository;
let activationErrorsService: ActivationErrorsService;
let originalFlag: boolean;
let originalWebhookUrl: string;

beforeAll(async () => {
	await testDb.init();

	const nodes: INodeTypeData = {
		'n8n-nodes-base.microsoftTeamsTrigger': { type: new MicrosoftTeamsTrigger(), sourcePath: '' },
	};
	await utils.initNodeTypes(nodes);
	// The whole `extends` chain, so the stored credential resolves its defaults.
	Container.get(LoadNodesAndCredentials).loaded.credentials = {
		oAuth2Api: { type: new OAuth2Api(), sourcePath: '' },
		microsoftOAuth2Api: { type: new MicrosoftOAuth2Api(), sourcePath: '' },
		microsoftTeamsOAuth2Api: { type: new MicrosoftTeamsOAuth2Api(), sourcePath: '' },
	};

	// Decrypting a credential consults the license state (external secrets).
	new LicenseMocker().mockLicenseState(Container.get(LicenseState));

	// The trigger refuses a non-HTTPS notification URL before it calls Graph.
	const globalConfig = Container.get(GlobalConfig);
	originalWebhookUrl = globalConfig.webhookUrl;
	globalConfig.webhookUrl = 'https://n8n.example.com/';

	Container.get(InstanceSettings).markAsLeader();
	originalFlag = Container.get(WorkflowsConfig).useWorkflowPublicationService;

	consumer = Container.get(WorkflowPublicationOutboxConsumer);
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	workflowRepository = Container.get(WorkflowRepository);
	activationErrorsService = Container.get(ActivationErrorsService);
});

afterEach(async () => {
	nock.cleanAll();
	await activeWorkflowManager.removeAll();
	await activationErrorsService.clearAll();
	await testDb.truncate([
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowPublicationTriggerStatus',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedCredentials',
		'CredentialsEntity',
		'User',
	]);
});

afterAll(async () => {
	Container.get(WorkflowsConfig).useWorkflowPublicationService = originalFlag;
	Container.get(GlobalConfig).webhookUrl = originalWebhookUrl;
	await testDb.terminate();
});

/** `checkExists` lists subscriptions first; `persist` covers the activation retries. */
const mockGraphRefusingSubscription = () =>
	nock(GRAPH)
		.persist()
		.get('/v1.0/subscriptions')
		.reply(200, { value: [] })
		.post('/v1.0/subscriptions')
		.reply(403, { error: { code: 'ExtensionError', message: GRAPH_ERROR } });

async function createTeamsTriggerWorkflow() {
	const owner = await createOwner();
	const credential = await saveCredential(
		{
			name: 'Teams',
			type: 'microsoftTeamsOAuth2Api',
			data: {
				clientId: 'client-id',
				clientSecret: 'client-secret',
				oauthTokenData: { access_token: 'access-token', token_type: 'Bearer' },
			},
		},
		{ user: owner, role: 'credential:owner' },
	);

	const trigger: INode = {
		id: 'teams-trigger',
		name: 'Microsoft Teams Trigger',
		type: 'n8n-nodes-base.microsoftTeamsTrigger',
		typeVersion: 1,
		position: [0, 0],
		webhookId: uuid(),
		parameters: {
			authentication: 'microsoftTeamsOAuth2Api',
			event: 'newTeamMember',
			watchAllTeams: false,
			teamId: { __rl: true, mode: 'id', value: TEAM_ID },
		},
		credentials: { microsoftTeamsOAuth2Api: { id: credential.id, name: credential.name } },
	};

	const workflow = await createWorkflowWithHistory({ active: true, nodes: [trigger] }, owner);
	await setActiveVersion(workflow.id, workflow.versionId);
	return { workflow, trigger };
}

describe('Microsoft Teams Trigger: Graph refuses the subscription', () => {
	test('legacy path: activation rejects with the Graph error and registers it', async () => {
		Container.get(WorkflowsConfig).useWorkflowPublicationService = false;
		const scope = mockGraphRefusingSubscription();
		const { workflow } = await createTeamsTriggerWorkflow();

		await expect(activeWorkflowManager.add(workflow.id, 'activate')).rejects.toThrow(GRAPH_ERROR);

		expect(scope.isDone()).toBe(true);
		expect(await activationErrorsService.get(workflow.id)).toBe(GRAPH_ERROR);
	});

	test('publication path: the failure reaches the publication surfaces only', async () => {
		Container.get(WorkflowsConfig).useWorkflowPublicationService = true;
		const scope = mockGraphRefusingSubscription();
		const { workflow, trigger } = await createTeamsTriggerWorkflow();

		await outboxRepository.enqueue(workflow.id, workflow.versionId, 'publish');
		const record = await outboxRepository.claimNextPendingRecord();
		expect(record).not.toBeNull();

		await consumer.processRecord(record!, new AbortController().signal);

		expect(scope.isDone()).toBe(true);

		// Recorded: outbox record, per-trigger status, status endpoint, UI push.
		expect(await outboxRepository.findOneBy({ id: record!.id })).toMatchObject({
			status: 'failed',
			errorMessage: GRAPH_ERROR,
		});
		const triggerRows = await Container.get(
			WorkflowPublicationTriggerStatusRepository,
		).findByWorkflowId(workflow.id);
		expect(triggerRows).toEqual([
			expect.objectContaining({ nodeId: trigger.id, status: 'failed', errorMessage: GRAPH_ERROR }),
		]);
		expect(
			await Container.get(WorkflowPublicationStatusService).getStatus(workflow.id),
		).toMatchObject({
			status: 'failed',
			liveVersionId: null,
			triggers: [{ nodeId: trigger.id, status: 'failed', errorMessage: GRAPH_ERROR }],
		});
		expect(push.sendToUsers).toHaveBeenCalledWith(
			{
				type: 'workflowFailedToActivate',
				data: { workflowId: workflow.id, errorMessage: GRAPH_ERROR },
			},
			expect.any(Array),
		);

		// Not recorded: the workflow stays active and the legacy surfaces stay clean.
		expect(await workflowRepository.findById(workflow.id)).toMatchObject({
			active: true,
			activeVersionId: workflow.versionId,
		});
		expect(await activationErrorsService.get(workflow.id)).toBeNull();
		expect(await Container.get(ActiveWorkflowsService).getAllActiveIdsInStorage()).toEqual([
			workflow.id,
		]);
	}, 60_000);
});
