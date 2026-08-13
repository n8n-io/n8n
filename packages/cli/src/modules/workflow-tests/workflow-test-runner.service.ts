import { ExecutionsConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createRunExecutionData, UnexpectedError } from 'n8n-workflow';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRunner } from '@/workflow-runner';

import type { WorkflowTest } from './database/entities/workflow-test.entity';
import { TestDiffService } from './test-diff.service';
import type { WorkflowTestRunResult } from './workflow-tests.types';

@Service()
export class WorkflowTestRunnerService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly testDiffService: TestDiffService,
	) {}

	async runTest(test: WorkflowTest, userId: string): Promise<WorkflowTestRunResult> {
		const workflow = await this.workflowRepository.get({ id: test.workflowId });
		if (!workflow) throw new UnexpectedError(`Workflow ${test.workflowId} not found`);

		const pinData = test.fixtures;

		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'evaluation',
			pinData,
			triggerToStartFrom: { name: test.triggerNodeName },
			forceFullExecutionData: true,
			suppressErrorWorkflow: true,
			workflowData: {
				...workflow,
				settings: {
					...workflow.settings,
					saveManualExecutions: true,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'all',
					saveExecutionProgress: false,
				},
			},
			userId,
		};

		if (this.executionsConfig.mode === 'queue') {
			data.executionData = createRunExecutionData({
				executionData: null,
				resultData: { pinData },
				manualData: {
					userId,
					triggerToStartFrom: { name: test.triggerNodeName },
					suppressErrorWorkflow: true,
				},
			});
		}

		const executionId = await this.workflowRunner.run(data);
		const run = await this.activeExecutions.getPostExecutePromise(executionId);

		return this.testDiffService.diff({
			testId: test.id,
			testName: test.name,
			executionId,
			expectations: test.expectations,
			actualRunData: run?.data.resultData.runData ?? {},
			runError: run?.data.resultData.error
				? { message: run.data.resultData.error.message }
				: undefined,
		});
	}
}
