import { sleep } from '@n8n/utils/sleep';

import type { EvalLogger } from './logger';
import {
	isTransientExecutionAbort,
	MAX_EXEC_ATTEMPTS,
	extractErrorMessage,
} from './transient-error';
import type { N8nClient } from '../clients/n8n-client';
import type { SeedPriorRun } from '../types';

/** What one pre-turn run did, so the caller can see what history the agent was given
 *  — and, above all, whether the run failed the way the case intended. */
export interface PriorRunOutcome {
	/** The name the case declared, not the uniquified name on the instance. */
	workflow: string;
	workflowId: string;
	success: boolean;
	errors: string[];
}

export interface PriorRunsOptions {
	client: N8nClient;
	priorRuns: SeedPriorRun[];
	/** Declared seed name → the workflow id created for it. */
	workflowIdsByName: Map<string, string>;
	logger: EvalLogger;
	timeoutMs?: number;
	laneTag?: string;
	/** Injectable for tests. */
	sleep?: (ms: number) => Promise<void>;
}

/**
 * Run seeded workflows BEFORE the graded turn, so the instance carries real execution
 * history the agent can look up.
 *
 * A failing run is the point rather than a problem. `hints` steers the mock layer the
 * same way `executionScenarios[].dataSetup` does, so a case can establish "the 06:00 run
 * died on the HTTP node" and then ask only "it broke again" — the agent has to go and
 * find out how.
 *
 * A failed prior run therefore NEVER fails the build. Outcomes come back for the log;
 * the only fatal case is a workflow the seed never created, which is an authoring
 * mistake worth stopping for.
 *
 * Runs sequentially in declared order: a case can stage a sequence (a run that succeeds,
 * then one that fails) and later runs may depend on state the earlier ones left behind.
 */
export async function executePriorRuns(options: PriorRunsOptions): Promise<PriorRunOutcome[]> {
	const { client, priorRuns, workflowIdsByName, logger, timeoutMs, laneTag } = options;
	const delay = options.sleep ?? sleep;
	const outcomes: PriorRunOutcome[] = [];

	for (const priorRun of priorRuns) {
		const workflowId = workflowIdsByName.get(priorRun.workflow);
		if (!workflowId) {
			// The schema cross-checks these names at load, so reaching here means the
			// seed did not create what it declared. Failing loudly beats grading a case
			// whose premise silently never happened.
			throw new Error(
				`Prior run names workflow "${priorRun.workflow}", which the seed did not create. Created: ${[...workflowIdsByName.keys()].join(', ') || '(none)'}`,
			);
		}

		const outcome = await runOnce(client, priorRun, workflowId, logger, delay, timeoutMs);
		outcomes.push(outcome);
		logger.info(
			`  Prior run "${priorRun.workflow}": ${
				outcome.success ? 'succeeded' : `failed (${outcome.errors.join('; ') || 'no error detail'})`
			}${laneTag ?? ''}`,
		);
	}

	return outcomes;
}

async function runOnce(
	client: N8nClient,
	priorRun: SeedPriorRun,
	workflowId: string,
	logger: EvalLogger,
	delay: (ms: number) => Promise<void>,
	timeoutMs?: number,
): Promise<PriorRunOutcome> {
	const base = { workflow: priorRun.workflow, workflowId };

	for (let attempt = 1; attempt <= MAX_EXEC_ATTEMPTS; attempt++) {
		try {
			const result = await client.executeWithLlmMock(workflowId, priorRun.hints, timeoutMs);
			// A DB write race aborts the run before any node executes and reports in-band.
			// That is not the failure the case is staging, so retry it rather than record it.
			if (!result.success && isTransientExecutionAbort(result.errors)) {
				if (attempt < MAX_EXEC_ATTEMPTS) {
					logger.warn(
						`    Prior run "${priorRun.workflow}" hit a transient DB abort (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}); retrying`,
					);
					await delay(500 * attempt);
					continue;
				}
			}
			return { ...base, success: result.success, errors: result.errors };
		} catch (error: unknown) {
			// Infrastructure, not the staged failure. Recorded rather than thrown: the
			// graded turn is what this eval measures, and killing the build here would
			// report an instance problem as a builder problem.
			const message = extractErrorMessage(error);
			logger.warn(`    Prior run "${priorRun.workflow}" could not complete: ${message}`);
			return { ...base, success: false, errors: [message] };
		}
	}

	// Unreachable: the loop either returns or exhausts into the final attempt's return.
	return { ...base, success: false, errors: ['prior run exhausted its retries'] };
}
