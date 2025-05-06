import { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Config } from '@oclif/core';
import { mock } from 'jest-mock-extended';
import type { IRun } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { OwnershipService } from '@/services/ownership.service';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';
import { WorkflowRunner } from '@/workflow-runner';
import { mockInstance } from '@test/mocking';

import { Execute } from '../execute';

const taskRunnerModule = mockInstance(TaskRunnerModule);
const workflowRepository = mockInstance(WorkflowRepository);
const ownershipService = mockInstance(OwnershipService);
const workflowRunner = mockInstance(WorkflowRunner);
const activeExecutions = mockInstance(ActiveExecutions);

test('should start a task runner when task runners are enabled', async () => {
	// arrange

	const workflow = mock<WorkflowEntity>({
		id: '123',
		nodes: [{ type: 'n8n-nodes-base.manualTrigger' }],
	});

	const run = mock<IRun>({ data: { resultData: { error: undefined } } });

	workflowRepository.findOneBy.mockResolvedValue(workflow);
	ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: '123' }));
	workflowRunner.run.mockResolvedValue('123');
	activeExecutions.getPostExecutePromise.mockResolvedValue(run);

	Container.set(GlobalConfig, mock<GlobalConfig>({ taskRunners: { enabled: true } }));

	const cmd = new Execute([], {} as Config);
	// @ts-expect-error Private property
	cmd.parse = jest.fn().mockResolvedValue({ flags: { id: '123' } });
	cmd.init = jest.fn().mockResolvedValue(undefined);

	// act

	await cmd.run();

	// assert

	expect(taskRunnerModule.start).toHaveBeenCalledTimes(1);
});
