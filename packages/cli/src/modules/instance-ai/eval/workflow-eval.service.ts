/**
 * WorkflowEvalService — Orchestrator for the eval pipeline (TRUST-44).
 *
 * Composes three services into a single executeAndEvaluate() call:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ WorkflowEvalService (orchestrator)          │  ← consumers call this
 *   │   .executeAndEvaluate(workflowId, options)  │
 *   └──────────┬──────────┬───────────┬───────────┘
 *              │          │           │
 *       ┌──────┴──┐  ┌────┴────┐  ┌──┴──────────┐
 *       │ Eval    │  │MockData │  │   Eval      │
 *       │ Exec    │  │ Storage │  │   Judge     │
 *       │ Service │  │ Service │  │   Service   │
 *       └─────────┘  └─────────┘  └─────────────┘
 *
 * - EvalExecutionService: Phase 1 (analysis) + Phase 2 (mock execution)
 * - EvalJudgeService: Phase 3 (tool-based verification against success criteria)
 * - MockDataStorageService: Persists mock outputs as pin data for instant re-runs
 *
 * When successCriteria is provided, the judge evaluates the execution result.
 * When persistMockData is true, mocked outputs are stored as workflow pin data.
 */

import type { InstanceAiWorkflowEvalResult, InstanceAiWorkflowEvalRequest } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EvalExecutionService } from './execution.service';
import { EvalJudgeService } from './judge.service';
import { MockDataStorageService } from './mock-data-storage.service';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Service()
export class WorkflowEvalService {
	constructor(
		private readonly evalExecutionService: EvalExecutionService,
		private readonly evalJudgeService: EvalJudgeService,
		private readonly mockDataStorageService: MockDataStorageService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly logger: Logger,
	) {}

	/**
	 * Execute a workflow with mock data and optionally evaluate + persist results.
	 *
	 * @param workflowId - The workflow to execute
	 * @param user - The user context for authorization
	 * @param options - scenarioHints, successCriteria (triggers judge), persistMockData (triggers storage)
	 */
	async executeAndEvaluate(
		workflowId: string,
		user: User,
		options: InstanceAiWorkflowEvalRequest = {},
	): Promise<InstanceAiWorkflowEvalResult> {
		// Phase 1+2: Execute with LLM mock
		const execution = await this.evalExecutionService.executeWithLlmMock(workflowId, user, {
			scenarioHints: options.scenarioHints,
		});

		const result: InstanceAiWorkflowEvalResult = { execution };

		// Phase 3: Judge (when successCriteria is provided)
		if (options.successCriteria) {
			result.verification = await this.runJudge(
				workflowId,
				user,
				execution,
				options.successCriteria,
				options.scenarioHints,
			);
		}

		// Phase 4: Persist mock data as pin data (when requested)
		if (options.persistMockData) {
			try {
				result.pinDataPersisted = await this.mockDataStorageService.persistAsPinData(
					workflowId,
					execution,
				);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				this.logger.error(`[WorkflowEval] Failed to persist mock data as pin data: ${message}`);
				result.pinDataPersisted = false;
			}
		}

		return result;
	}

	// ── Judge orchestration ───────────────────────────────────────────────

	private async runJudge(
		workflowId: string,
		user: User,
		execution: InstanceAiWorkflowEvalResult['execution'],
		successCriteria: string,
		scenarioHints?: string,
	): Promise<NonNullable<InstanceAiWorkflowEvalResult['verification']>> {
		// Fetch the workflow JSON for the judge to inspect structure/connections
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
			'workflow:execute',
		]);

		if (!workflow) {
			this.logger.warn(`[WorkflowEval] Workflow ${workflowId} not found for judge — skipping`);
			return {
				pass: false,
				reasoning: 'Could not load workflow for verification',
				failureCategory: 'verification_gap',
			};
		}

		return await this.evalJudgeService.judge(execution, workflow, successCriteria, scenarioHints);
	}
}
