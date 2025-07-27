import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository, DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { IRun } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { DeprecationService } from '@/deprecation/deprecation.service';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
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
const posthogClient = mockInstance(PostHogClient);
const telemetryEventRelay = mockInstance(TelemetryEventRelay);
const externalHooks = mockInstance(ExternalHooks);

const dbConnection = mockInstance(DbConnection);
dbConnection.init.mockResolvedValue(undefined);
dbConnection.migrate.mockResolvedValue(undefined);

test('should start a task runner when task runners are enabled', async () => {
	// arrange

	const workflow = mock<WorkflowEntity>({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});

	const run = mock<IRun>({ data: { resultData: { error: undefined } } });

	const queryBuilder = mock<SelectQueryBuilder<WorkflowEntity>>({
		andWhere: jest.fn().mockReturnThis(),
		getMany: jest.fn().mockResolvedValue([workflow]),
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
			taskRunners: { enabled: true },
			nodes: { communityPackages: { enabled: false } },
		}),
	);

	const cmd = new ExecuteBatch();
	// @ts-expect-error Protected property
	cmd.flags = {};
	// @ts-expect-error Private property
	cmd.runTests = jest.fn().mockResolvedValue({ summary: { failedExecutions: [] } });

	// act

	await cmd.init();
	await cmd.run();

	// assert

	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
});
