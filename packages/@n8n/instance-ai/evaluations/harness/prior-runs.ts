import { sleep } from '@n8n/utils/sleep';

import type { EvalLogger } from './logger';
import {
	extractErrorMessage,
	isTransientExecutionAbort,
	MAX_EXEC_ATTEMPTS,
	shouldRetryScenarioExecution,
	throwIfServerBudgetStop,
} from './transient-error';
import type { N8nClient } from '../clients/n8n-client';
import type { SeedPriorRun } from '../types';

/**
 * Staging is not the graded turn, so it gets its own budget. A scenario execution is
 * given `effectiveTimeoutMs(complexity, args.timeoutMs)` — 900s by default, 1350s for a
 * complex case — and a prior run may retry, which would let scene-setting outspend the
 * thing under test. Passed explicitly rather than left to the client default, which
 * happens to match today but is not staging's to inherit.
 */
export const STAGING_TIMEOUT_MS = 120_000;

/** What one pre-turn run did, so the caller can see what history the agent was given. */
export interface PriorRunOutcome {
	/** The seed id the case named. */
	workflow: string;
	workflowId: string;
	/**
	 * Whether an execution record exists. This is the field that separates "failed
	 * exactly as the case staged" from "never ran, so the premise is missing" —
	 * `success: false` alone cannot tell those apart, and only the second is a reason
	 * to distrust the grade.
	 */
	ran: boolean;
	/** Present whenever the run reached the instance. Proof the record landed. */
	executionId?: string;
	success: boolean;
	errors: string[];
}

export interface PriorRunsOptions {
	client: N8nClient;
	priorRuns: SeedPriorRun[];
	/** Authored seed id → the restored workflow, as `seedWorkflowsBySeedId` holds it. */
	seedWorkflows: Map<string, { id: string; name: string }>;
	logger: EvalLogger;
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
 * A failed prior run therefore never fails the build. A prior run that never RAN is a
 * different matter: the caller reads `ran` and routes the case to infra, because the
 * premise it was graded against does not exist.
 *
 * Runs sequentially in declared order: a case can stage a sequence (a run that succeeds,
 * then one that fails) and later runs may depend on state the earlier ones left behind.
 */
export async function executePriorRuns(options: PriorRunsOptions): Promise<PriorRunOutcome[]> {
	const { client, priorRuns, seedWorkflows, logger, laneTag } = options;
	const delay = options.sleep ?? sleep;
	const outcomes: PriorRunOutcome[] = [];

	for (const priorRun of priorRuns) {
		const restored = seedWorkflows.get(priorRun.workflow);
		if (!restored) {
			// The schema cross-checks these ids at load, so reaching here means the seed
			// did not create what it declared. Failing loudly beats grading a case whose
			// premise silently never happened.
			throw new Error(
				`Prior run names seed workflow id "${priorRun.workflow}", which the seed did not create. Created: ${[...seedWorkflows.keys()].join(', ') || '(none)'}`,
			);
		}

		const label = `${restored.name} (${priorRun.workflow})`;
		const outcome = await runOnce(client, priorRun, restored.id, label, logger, delay);
		outcomes.push(outcome);
		logger.info(
			`  Prior run "${label}": ${
				outcome.ran
					? outcome.success
						? 'succeeded'
						: `failed (${outcome.errors.join('; ') || 'no error detail'})`
					: `NEVER RAN — no execution record (${outcome.errors.join('; ') || 'no error detail'})`
			}${laneTag ?? ''}`,
		);
	}

	return outcomes;
}

/**
 * Whether an execution record actually exists for this result.
 *
 * The result SHAPE cannot answer it. The eval service rejects some requests before it
 * ever calls the workflow runner — an unknown workflow, no trigger node — and returns an
 * error result carrying a freshly minted UUID that no execution was ever stored under.
 * Trusting `executionId` there would report a premise that does not exist as staged
 * history, which is the reading this whole flag exists to prevent.
 *
 * Only checked on a failed result: a run that succeeded necessarily executed.
 */
async function executionRecordExists(
	client: N8nClient,
	result: { success: boolean; executionId: string },
): Promise<boolean> {
	if (result.success) return true;
	if (!result.executionId) return false;
	try {
		const execution = await client.getExecution(result.executionId);
		return execution.id === result.executionId;
	} catch {
		// A miss is the answer, not an error: the record is not there.
		return false;
	}
}

async function runOnce(
	client: N8nClient,
	priorRun: SeedPriorRun,
	workflowId: string,
	label: string,
	logger: EvalLogger,
	delay: (ms: number) => Promise<void>,
): Promise<PriorRunOutcome> {
	const base = { workflow: priorRun.workflow, workflowId };
	let lastErrors: string[] = [];

	for (let attempt = 1; attempt <= MAX_EXEC_ATTEMPTS; attempt++) {
		let retryReason: string;
		try {
			const result = await client.executeWithLlmMock(
				workflowId,
				priorRun.hints,
				STAGING_TIMEOUT_MS,
			);
			// A run the server stopped for exceeding its budget comes back in-band. Recording
			// it as a staged failure would put HARNESS text in the execution record the graded
			// agent then reads as the workflow's own failure reason.
			throwIfServerBudgetStop(result);
			// A DB write race aborts the run before any node executes and reports in-band.
			// That is not the failure the case is staging, so retry it rather than record it.
			if (result.success || !isTransientExecutionAbort(result.errors)) {
				return {
					...base,
					ran: await executionRecordExists(client, result),
					executionId: result.executionId,
					success: result.success,
					errors: result.errors,
				};
			}
			lastErrors = result.errors;
			retryReason = `transient DB abort (${result.errors.join('; ') || 'no error detail'})`;
		} catch (error: unknown) {
			const message = extractErrorMessage(error);
			// Infrastructure, not the staged failure. Retried on the same terms a scenario
			// execution gets, because a blip here silently voids the case's premise: the
			// graded turn would then run against history that never landed.
			if (!shouldRetryScenarioExecution(message, attempt)) {
				logger.warn(`    Prior run "${label}" could not complete: ${message}`);
				return { ...base, ran: false, success: false, errors: [message] };
			}
			lastErrors = [message];
			retryReason = message;
		}
		// Only the throw branch caps itself, via `shouldRetryScenarioExecution`. The
		// in-band abort branch falls through to here, so the last attempt would otherwise
		// announce a retry it will not make and sleep before giving up.
		if (attempt < MAX_EXEC_ATTEMPTS) {
			logger.warn(
				`    Prior run "${label}" ${retryReason} (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}); retrying`,
			);
			await delay(500 * attempt);
		}
	}

	// Every attempt hit a retryable fault, so no execution record landed. Reports the last
	// real errors rather than a synthetic message, so the log names what went wrong.
	return { ...base, ran: false, success: false, errors: lastErrors };
}
