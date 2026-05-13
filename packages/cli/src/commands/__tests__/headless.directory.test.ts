jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity as WorkflowEntityType } from '@n8n/db';
import {
	AuthRolesService,
	BinaryDataRepository,
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
import type { INodeType } from 'n8n-workflow';
import { resolve } from 'node:path';

import { Headless } from '../headless';

import { ActiveExecutions } from '@/active-executions';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { HeadlessWebhookServer } from '../headless/headless-webhook-server';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { License } from '@/license';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowService } from '@/workflows/workflow.service';

jest.mock('@/public-api/v1/handlers/workflows/workflows.service', () => ({
	createWorkflow: jest.fn(),
}));

mockInstance(TaskRunnerModule);
const workflowRepository = mockInstance(WorkflowRepository);
const userRepository = mockInstance(UserRepository);
const projectRepository = mockInstance(ProjectRepository);
mockInstance(ProjectRelationRepository);
const settingsRepository = mockInstance(SettingsRepository);
mockInstance(WorkflowRunner);
mockInstance(ActiveExecutions);
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
const shutdownService = mockInstance(ShutdownService);
const deprecationService = mockInstance(DeprecationService);
const workflowService = mockInstance(WorkflowService);
const nodeTypes = mockInstance(NodeTypes);
const headlessWebhookServer = mockInstance(HeadlessWebhookServer);
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

const WORKFLOWS_DIR = resolve(__dirname, '../../../test/commands/headless/fixtures/workflows-dir');

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

test('headless command activates every workflow in a directory and binds the webhook listener when needed', async () => {
	const owner = buildOwner();
	userRepository.findOne.mockResolvedValue(owner);
	projectRepository.getPersonalProjectForUser.mockResolvedValue(buildPersonalProject(owner.id));
	settingsRepository.upsert.mockResolvedValue({} as never);

	// The fixture directory contains 01-webhook.json + 02-schedule.json,
	// each parsed into one workflow. Return distinct WorkflowEntity stubs
	// for each createWorkflow call so we can assert ordering.
	jest
		.mocked(publicApiCreateWorkflow)
		.mockResolvedValueOnce(
			mock<WorkflowEntityType>({ id: 'wf-webhook', name: 'Headless Webhook Workflow' }),
		)
		.mockResolvedValueOnce(
			mock<WorkflowEntityType>({ id: 'wf-schedule', name: 'Headless Schedule Workflow' }),
		);
	workflowService.activateWorkflow.mockResolvedValue(mock<WorkflowEntityType>({ active: true }));
	workflowRepository.findOneBy.mockResolvedValue(mock<WorkflowEntityType>({ id: 'wf-webhook' }));

	nodeTypes.getByNameAndVersion.mockImplementation((type) => {
		if (type === 'n8n-nodes-base.webhook' || type === 'n8n-nodes-base.scheduleTrigger') {
			return mock<INodeType>({
				description: mock<INodeType['description']>({ group: ['trigger'] }),
			});
		}
		throw new Error(`Unknown node type ${type}`);
	});

	headlessWebhookServer.init.mockResolvedValue(undefined);
	headlessWebhookServer.start.mockResolvedValue(undefined);
	headlessWebhookServer.markAsReady.mockReturnValue(undefined);
	headlessWebhookServer.close.mockResolvedValue(undefined);
	activeWorkflowManager.removeAll.mockResolvedValue(undefined);

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
		workflow: WORKFLOWS_DIR,
		credentials: undefined,
		port: 5678,
		host: '127.0.0.1',
		logLevel: 'silent',
	};

	await cmd.init();
	const runPromise = cmd.run();

	// Let activation + server start settle into waitWhileActive.
	await new Promise<void>((r) => setTimeout(r, 25));

	// Both workflows were created and activated (in lexicographic file order).
	expect(publicApiCreateWorkflow).toHaveBeenCalledTimes(2);
	expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
		1,
		owner,
		expect.objectContaining({ name: 'Headless Webhook Workflow' }),
	);
	expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
		2,
		owner,
		expect.objectContaining({ name: 'Headless Schedule Workflow' }),
	);
	expect(workflowService.activateWorkflow).toHaveBeenCalledTimes(2);

	// Webhook listener bound because at least one workflow has a webhook trigger.
	expect(headlessWebhookServer.start).toHaveBeenCalledTimes(1);
	expect(headlessWebhookServer.markAsReady).toHaveBeenCalledTimes(1);

	await cmd.stopProcess();
	await runPromise;

	// Teardown: lifecycle deactivates all, then the server closes.
	expect(activeWorkflowManager.removeAll).toHaveBeenCalledTimes(1);
	expect(headlessWebhookServer.close).toHaveBeenCalledTimes(1);
});
