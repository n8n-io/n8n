import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Config } from '@oclif/core';
import { mock } from 'jest-mock-extended';
import type { IRun } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
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
import { mockInstance } from '@test/mocking';

import { Execute } from '../execute';

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

jest.mock('@/db', () => ({
	init: jest.fn().mockResolvedValue(undefined),
	migrate: jest.fn().mockResolvedValue(undefined),
	connectionState: { connected: false },
	close: jest.fn().mockResolvedValue(undefined),
}));

test('should start a task runner when task runners are enabled', async () => {
	// arrange

	const workflow = mock<WorkflowEntity>({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});

	const run = mock<IRun>({ data: { resultData: { error: undefined } } });

	loadNodesAndCredentials.init.mockResolvedValue(undefined);
	shutdownService.shutdown.mockReturnValue();
	deprecationService.warn.mockReturnValue();
	posthogClient.init.mockResolvedValue();
	telemetryEventRelay.init.mockResolvedValue();
	externalHooks.init.mockResolvedValue();

	workflowRepository.findOneBy.mockResolvedValue(workflow);
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

	const cmd = new Execute([], {} as Config);
	// @ts-expect-error Private property
	cmd.parse = jest.fn().mockResolvedValue({ flags: { id: '123' } });

	// act

	await cmd.init();
	await cmd.run();

	// assert

	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
});
