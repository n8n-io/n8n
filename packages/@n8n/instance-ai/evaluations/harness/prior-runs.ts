import type { InstanceAiEvalSeedWorkflow } from '@n8n/api-types';
import { setTimeout as delay } from 'node:timers/promises';

import type { EvalLogger } from './logger';
import { isTransientExecutionAbort } from './transient-error';
import type { N8nClient } from '../clients/n8n-client';
import type { SeedPriorRun } from '../types';

/** Drop the ` [seed <8hex>]` uniquifier that seeding adds to artifact names. */
function stripSeedSuffix(name: string): string {
	return name.replace(/ \[seed [0-9a-f]{8}\]$/i, '');
}

/** Matches the post-build execution path, which retries the same class of abort. */
const MAX_ATTEMPTS = 3;

/** A prior run only has to produce an execution record, so it gets a shorter leash
 *  than a graded scenario execution — it is setup, not the thing under test. */
const TIMEOUT_MS = 90_000;

/**
 * Run seeded workflows before the graded turn, so their executions exist in history.
 *
 * This is the only way execution history becomes reachable as a context surface: the
 * harness otherwise executes a workflow only *after* the build, which is too late for a
 * turn that asks about "the last run".
 *
 * A failed run is a legitimate — often the intended — outcome. A case establishes that
 * the 06:00 run died on the HTTP node, then asks only "it broke again", and the honest
 * answer requires reading the record rather than guessing. So execution failure is logged
 * and returned, never thrown: the only fatal error here is being unable to run at all.
 */
export async function executePriorRuns(
	client: N8nClient,
	priorRuns: SeedPriorRun[],
	seededWorkflows: InstanceAiEvalSeedWorkflow[],
	seededWorkflowIds: string[],
	logger: EvalLogger,
	laneTag?: string,
): Promise<Array<{ workflow: string; workflowId: string; success: boolean; errors: string[] }>> {
	if (priorRuns.length === 0) return [];

	// `restoreThread` returns ids in input order. A length mismatch means names cannot be
	// mapped to ids, so refuse rather than run the wrong workflow.
	if (seededWorkflows.length !== seededWorkflowIds.length) {
		throw new Error(
			`Cannot resolve prior runs: seeded ${String(seededWorkflows.length)} workflow(s) but got ${String(seededWorkflowIds.length)} id(s) back`,
		);
	}
	// Seeding appends a ` [seed <8hex>]` uniquifier to workflow names, so the name the
	// case authored is never the name that reaches the instance. Index alignment is the
	// reliable join (input order is guaranteed); the stripped name is registered too so
	// this works whether the caller passes authored or remapped workflows.
	const idByName = new Map<string, string>();
	for (const [i, wf] of seededWorkflows.entries()) {
		const id = seededWorkflowIds[i];
		idByName.set(wf.name, id);
		idByName.set(stripSeedSuffix(wf.name), id);
	}

	const results: Array<{
		workflow: string;
		workflowId: string;
		success: boolean;
		errors: string[];
	}> = [];

	for (const run of priorRuns) {
		const workflowId = idByName.get(run.workflow);
		if (!workflowId) {
			// The schema refuses unknown names at authoring time, so reaching here means the
			// seed's own remapping diverged — worth failing loudly rather than skipping.
			throw new Error(
				`Prior run names workflow "${run.workflow}", which was not seeded. Seeded: ${seededWorkflows.map((wf) => stripSeedSuffix(wf.name)).join(', ') || '(none)'}`,
			);
		}

		let result = await client.executeWithLlmMock(workflowId, run.hints, TIMEOUT_MS);
		for (
			let attempt = 1;
			!result.success && isTransientExecutionAbort(result.errors) && attempt < MAX_ATTEMPTS;
			attempt++
		) {
			logger.warn(
				`    prior run "${run.workflow}" aborted by a transient error (attempt ${String(attempt)}/${String(MAX_ATTEMPTS)}); retrying`,
			);
			await delay(500 * attempt);
			result = await client.executeWithLlmMock(workflowId, run.hints, TIMEOUT_MS);
		}

		// Said plainly in both directions: a green prior run and a red one are both valid
		// setups, and reading this line is how an author confirms they got the one they meant.
		logger.info(
			`  Prior run "${run.workflow}": ${result.success ? 'succeeded' : `failed (${result.errors.join('; ') || 'no error detail'})`}${laneTag ?? ''}`,
		);
		results.push({
			workflow: run.workflow,
			workflowId,
			success: result.success,
			errors: result.errors,
		});
	}
	return results;
}
