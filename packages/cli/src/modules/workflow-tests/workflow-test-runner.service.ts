import { ExecutionsConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createRunExecutionData } from 'n8n-workflow';
import type { INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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
		if (!workflow) throw new NotFoundError(`Workflow ${test.workflowId} not found`);

		const staleness = this.findStaleness(test, workflow.nodes ?? []);
		if (staleness.length > 0) {
			return {
				testId: test.id,
				testName: test.name,
				executionId: null,
				status: 'error',
				nodeResults: [],
				errorMessage: `Test is stale: ${staleness.join('; ')}`,
				completedAt: new Date().toISOString(),
			};
		}

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

	/**
	 * A test's fixtures/trigger reference nodes by name, captured at test-creation time.
	 * If the workflow has since been edited, those nodes may no longer exist — running
	 * the test would then silently skip the pin/mock for that node and hit whatever
	 * external service it calls for real. Detect that here and refuse to run.
	 */
	private findStaleness(test: WorkflowTest, nodes: INode[]): string[] {
		const nodeNames = new Set(nodes.map((n) => n.name));
		const missing: string[] = [];

		if (!nodeNames.has(test.triggerNodeName)) {
			missing.push(`node "${test.triggerNodeName}" no longer exists in the workflow`);
		}

		for (const fixtureNodeName of Object.keys(test.fixtures)) {
			if (!nodeNames.has(fixtureNodeName)) {
				missing.push(`node "${fixtureNodeName}" no longer exists in the workflow`);
			}
		}

		return missing;
	}
}
