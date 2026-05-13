jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity as WorkflowEntityType } from '@n8n/db';
import {
	AuthRolesService,
	BinaryDataRepository,
	CredentialsEntity,
	DbConnection,
	GLOBAL_OWNER_ROLE,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	Role,
	SettingsRepository,
	User as UserEntity,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IRun } from 'n8n-workflow';
import { resolve } from 'node:path';

import { Headless } from '../headless';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { License } from '@/license';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { saveCredential as publicApiSaveCredential } from '@/public-api/v1/handlers/credentials/credentials.service';
import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowService } from '@/workflows/workflow.service';

jest.mock('@/public-api/v1/handlers/workflows/workflows.service', () => ({
	createWorkflow: jest.fn(),
}));

jest.mock('@/public-api/v1/handlers/credentials/credentials.service', () => ({
	saveCredential: jest.fn(),
}));

mockInstance(TaskRunnerModule);
const workflowRepository = mockInstance(WorkflowRepository);
const userRepository = mockInstance(UserRepository);
const projectRepository = mockInstance(ProjectRepository);
mockInstance(ProjectRelationRepository);
const settingsRepository = mockInstance(SettingsRepository);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
mockInstance(ActiveWorkflowManager);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
const shutdownService = mockInstance(ShutdownService);
const deprecationService = mockInstance(DeprecationService);
const workflowService = mockInstance(WorkflowService);
mockInstance(NodeTypes);
mockInstance(MessageEventBus);
const posthogClient = mockInstance(PostHogClient);
const telemetryEventRelay = mockInstance(TelemetryEventRelay);
const externalHooks = mockInstance(ExternalHooks);
mockInstance(License);
mockInstance(LicenseState);
mockInstance(CommunityPackagesService);
mockInstance(WorkflowFailureNotificationEventRelay);

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);
mockInstance(AuthRolesService);
mockInstance(BinaryDataRepository);

const WORKFLOW_FIXTURE = resolve(
	__dirname,
	'../../../test/commands/headless/fixtures/workflow-with-creds.json',
);
const CREDENTIALS_FIXTURE = resolve(
	__dirname,
	'../../../test/commands/headless/fixtures/credentials.json',
);

const buildOwner = (): User => {
	const user = new UserEntity();
	user.id = 'owner-123';
	user.email = 'owner@example.com';
	user.firstName = 'Test';
	user.lastName = 'Owner';
	user.role = Object.assign(new Role(), { slug: GLOBAL_OWNER_ROLE.slug });
	return user;
};

const buildPersonalProject = (creatorId: string): Project => {
	const project = new Project();
	project.id = 'project-456';
	project.type = 'personal';
	project.name = 'Test Owner <owner@example.com>';
	project.creatorId = creatorId;
	return project;
};

beforeEach(() => {
	jest.clearAllMocks();
});

test('headless command imports credentials, rewires the workflow to use them, and runs the workflow', async () => {
	const owner = buildOwner();
	userRepository.findOne.mockResolvedValue(owner);
	projectRepository.getPersonalProjectForUser.mockResolvedValue(buildPersonalProject(owner.id));
	settingsRepository.upsert.mockResolvedValue({} as never);

	// The persisted credential gets a freshly-issued DB id, distinct from the
	// id baked into the fixture — verifying id→id rewrite via id-match.
	jest.mocked(publicApiSaveCredential).mockResolvedValue(
		Object.assign(new CredentialsEntity(), {
			id: 'cred-headless-001',
			name: 'Headless Test Credential',
			type: 'httpHeaderAuth',
		}),
	);

	const importedWorkflow = mock<WorkflowEntityType>({
		id: 'wf-1',
		name: 'Headless Workflow With Credentials',
		nodes: [
			{
				id: 'manual-trigger',
				name: 'When clicking Test Workflow',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
	});
	jest.mocked(publicApiCreateWorkflow).mockResolvedValue(importedWorkflow);
	workflowService.activateWorkflow.mockResolvedValue(
		mock<WorkflowEntityType>({ id: 'wf-1', active: true }),
	);
	workflowRepository.findOneBy.mockResolvedValue(importedWorkflow);

	workflowRunner.run.mockResolvedValue('exec-1');
	activeExecutions.getPostExecutePromise.mockResolvedValue(
		mock<IRun>({ data: { resultData: { error: undefined } } }),
	);

	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();

	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			taskRunners: {},
			nodes: {},
		}),
	);

	const cmd = new Headless();
	// @ts-expect-error Protected property
	cmd.flags = {
		workflow: WORKFLOW_FIXTURE,
		credentials: CREDENTIALS_FIXTURE,
		port: 5678,
		host: '127.0.0.1',
		logLevel: 'silent',
	};

	await cmd.init();
	await cmd.run();

	// Credential persisted
	expect(publicApiSaveCredential).toHaveBeenCalledTimes(1);
	expect(publicApiSaveCredential).toHaveBeenCalledWith(
		expect.objectContaining({
			name: 'Headless Test Credential',
			type: 'httpHeaderAuth',
			data: { apiKey: 'test-key-value' },
		}),
		owner,
	);

	// Workflow created with the credential reference left pointing at the
	// imported credential.
	const createCall = jest.mocked(publicApiCreateWorkflow).mock.calls[0];
	const workflowBody = createCall[1] as WorkflowEntityType;
	const httpNode = workflowBody.nodes.find((n) => n.name === 'HTTP Request');
	expect(httpNode?.credentials).toEqual({
		httpHeaderAuth: {
			id: 'cred-headless-001',
			name: 'Headless Test Credential',
		},
	});

	// Manual lifecycle ran one execution
	expect(workflowRunner.run).toHaveBeenCalledTimes(1);
});

test('headless command rewrites credential ids when the fixture id is stale but the name matches', async () => {
	const owner = buildOwner();
	userRepository.findOne.mockResolvedValue(owner);
	projectRepository.getPersonalProjectForUser.mockResolvedValue(buildPersonalProject(owner.id));
	settingsRepository.upsert.mockResolvedValue({} as never);

	// Service returns a fresh id, different from the one in the fixture.
	jest.mocked(publicApiSaveCredential).mockResolvedValue(
		Object.assign(new CredentialsEntity(), {
			id: 'cred-fresh-from-db',
			name: 'Headless Test Credential',
			type: 'httpHeaderAuth',
		}),
	);

	const importedWorkflow = mock<WorkflowEntityType>({
		id: 'wf-1',
		name: 'Headless Workflow With Credentials',
		nodes: [
			{
				id: 'manual-trigger',
				name: 'When clicking Test Workflow',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
	});
	jest.mocked(publicApiCreateWorkflow).mockResolvedValue(importedWorkflow);
	workflowService.activateWorkflow.mockResolvedValue(
		mock<WorkflowEntityType>({ id: 'wf-1', active: true }),
	);
	workflowRepository.findOneBy.mockResolvedValue(importedWorkflow);

	workflowRunner.run.mockResolvedValue('exec-1');
	activeExecutions.getPostExecutePromise.mockResolvedValue(
		mock<IRun>({ data: { resultData: { error: undefined } } }),
	);

	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();

	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			taskRunners: {},
			nodes: {},
		}),
	);

	const cmd = new Headless();
	// @ts-expect-error Protected property
	cmd.flags = {
		workflow: WORKFLOW_FIXTURE,
		credentials: CREDENTIALS_FIXTURE,
		port: 5678,
		host: '127.0.0.1',
		logLevel: 'silent',
	};

	await cmd.init();
	await cmd.run();

	const createCall = jest.mocked(publicApiCreateWorkflow).mock.calls[0];
	const workflowBody = createCall[1] as WorkflowEntityType;
	const httpNode = workflowBody.nodes.find((n) => n.name === 'HTTP Request');
	// The fixture's id ("cred-headless-001") doesn't match the DB's fresh id;
	// resolution falls back to name-match and rewrites the id.
	expect(httpNode?.credentials).toEqual({
		httpHeaderAuth: {
			id: 'cred-fresh-from-db',
			name: 'Headless Test Credential',
		},
	});
});
