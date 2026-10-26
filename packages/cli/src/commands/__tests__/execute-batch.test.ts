import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	WorkflowRepository,
	DbConnection,
	AuthRolesService,
	BinaryDataRepository,
	DeploymentKeyRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { type SelectQueryBuilder } from '@n8n/typeorm';
import { createEmptyRunExecutionData, type INode, type IRun } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ActiveExecutions } from '@/active-executions';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ActivityEventRelay } from '@/events/relays/activity.event-relay';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { WorkflowFailureNotificationEventRelay } from '@/events/relays/workflow-failure-notification.event-relay';
import { ExpressionObservabilityProvider } from '@/expression-observability/expression-observability.provider';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { PostHogClient } from '@/posthog';
import { OwnershipService } from '@/services/ownership.service';
import { ShutdownService } from '@/shutdown/shutdown.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { WorkflowRunner } from '@/workflow-runner';

import { ExecuteBatch } from '../execute-batch';

const taskRunnerModule = mockInstance(TaskRunnerModule);
const workflowRepository = mockInstance(WorkflowRepository);
const ownershipService = mockInstance(OwnershipService);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);
const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
const shutdownService = mockInstance(ShutdownService);
const deprecationService = mockInstance(DeprecationService);
mockInstance(MessageEventBus);
mockInstance(ExpressionObservabilityProvider);
const posthogClient = mockInstance(PostHogClient);
const telemetryEventRelay = mockInstance(TelemetryEventRelay);
const externalHooks = mockInstance(ExternalHooks);
mockInstance(License);
mockInstance(LicenseState);
mockInstance(CommunityPackagesService);
mockInstance(ActivityEventRelay);
mockInstance(WorkflowFailureNotificationEventRelay);

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);
mockInstance(AuthRolesService);
mockInstance(BinaryDataRepository);

const deploymentKeyRepository = mockInstance(DeploymentKeyRepository);
deploymentKeyRepository.findActiveIdentifier.mockResolvedValue(null);
deploymentKeyRepository.seedActiveIdentifier.mockResolvedValue(undefined);

test('should start a task runner and the policy modules', async () => {
	// arrange

	const workflow = mock<WorkflowEntity>({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});

	const run = mock<IRun>({ data: { resultData: { error: undefined } } });

	const queryBuilder = mock<SelectQueryBuilder<WorkflowEntity>>({
		andWhere: vi.fn().mockReturnThis(),
		getMany: vi.fn().mockResolvedValue([workflow]),
	});

	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();

	workflowRepository.createQueryBuilder.mockReturnValue(queryBuilder);
	ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: '123' }));
	workflowRunner.run.mockResolvedValue('123');
	activeExecutions.getPostExecutePromise.mockResolvedValue(run);

	Container.set(
		GlobalConfig,
		mock<GlobalConfig>({
			taskRunners: {},
			nodes: {},
		}),
	);

	const initModules = vi.spyOn(Container.get(ModuleRegistry), 'initModules');

	const cmd = new ExecuteBatch();
	// @ts-expect-error Protected property
	cmd.flags = {};
	// @ts-expect-error Private property
	cmd.runTests = vi.fn().mockResolvedValue({ summary: { failedExecutions: [] } });

	// act

	await cmd.init();
	await cmd.run();

	// assert

	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
	expect(initModules).toHaveBeenCalledWith(expect.anything(), [
		'policy-infrastructure',
		'type-availability-policies',
	]);
});

test('execute:batch needs the expression engine', () => {
	expect(new ExecuteBatch().needsExpressionEngine).toBe(true);
});

test.each([true, false])(
	'starts from the selected trigger when pinned data is %s',
	async (pinned) => {
		const startingNode = mock<INode>({
			name: 'Execute Workflow Trigger',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			notes: '',
		});
		const workflow = mock<WorkflowEntity>({
			id: '123',
			nodes: [
				mock<INode>({
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					notes: '',
				}),
				startingNode,
			],
			pinData: pinned ? { [startingNode.name]: [{ json: {} }] } : undefined,
		});
		ExecuteBatch.instanceOwner = mock<User>({ id: 'owner-id' });
		ExecuteBatch.cancelled = false;
		workflowRunner.run.mockResolvedValue('execution-id');
		activeExecutions.getPostExecutePromise.mockResolvedValue({
			...mock<IRun>(),
			startedAt: new Date('2026-01-01T00:00:00Z'),
			stoppedAt: new Date('2026-01-01T00:00:01Z'),
			data: createEmptyRunExecutionData(),
		});
		workflowRunner.run.mockClear();

		const result = await new ExecuteBatch().startThread(workflow);

		expect(result.error).toBeUndefined();
		expect(result.executionStatus).toBe('success');
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith({
			executionMode: 'cli',
			triggerToStartFrom: { name: startingNode.name },
			workflowData: workflow,
			userId: 'owner-id',
		});
	},
);
