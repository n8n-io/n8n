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
import type { IRun } from 'n8n-workflow';
import { resolve } from 'node:path';

import { Headless } from '../headless';

import { ActiveExecutions } from '@/active-executions';
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
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
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
	'../../../test/commands/headless/fixtures/workflow-manual.json',
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

test('headless command imports, activates, and runs a manual workflow to completion', async () => {
	// arrange ----------------------------------------------------------------

	const owner = buildOwner();
	userRepository.findOne.mockResolvedValue(owner);
	projectRepository.getPersonalProjectForUser.mockResolvedValue(buildPersonalProject(owner.id));
	settingsRepository.upsert.mockResolvedValue({} as never);

	// public-API createWorkflow returns a persisted entity
	const importedWorkflow = mock<WorkflowEntityType>({
		id: 'wf-1',
		name: 'Headless Manual Workflow',
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

	// activate is a no-op for the test
	workflowService.activateWorkflow.mockResolvedValue(
		mock<WorkflowEntityType>({ id: 'wf-1', active: true }),
	);

	// engine-adapter path: workflow lookup, runner run, post-execute promise
	workflowRepository.findOneBy.mockResolvedValue(importedWorkflow);
	workflowRunner.run.mockResolvedValue('exec-1');
	activeExecutions.getPostExecutePromise.mockResolvedValue(
		mock<IRun>({ data: { resultData: { error: undefined } } }),
	);

	// init-time mocks
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
		credentials: undefined,
		port: 5678,
		host: '127.0.0.1',
		logLevel: 'silent',
	};

	// act --------------------------------------------------------------------

	await cmd.init();
	await cmd.run();

	// assert -----------------------------------------------------------------

	expect(publicApiCreateWorkflow).toHaveBeenCalledTimes(1);
	expect(publicApiCreateWorkflow).toHaveBeenCalledWith(
		owner,
		expect.objectContaining({ name: 'Headless Manual Workflow' }),
	);
	expect(workflowService.activateWorkflow).toHaveBeenCalledWith(owner, 'wf-1', { source: 'api' });
	expect(workflowRunner.run).toHaveBeenCalledTimes(1);
});

test('headless command surfaces a UserError when --credentials is supplied (deferred to Task 10)', async () => {
	const owner = buildOwner();
	userRepository.findOne.mockResolvedValue(owner);

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
		credentials: '/tmp/some-creds.json',
		port: 5678,
		host: '127.0.0.1',
		logLevel: 'silent',
	};

	await cmd.init();
	await expect(cmd.run()).rejects.toThrow(/Task 10/);
});
