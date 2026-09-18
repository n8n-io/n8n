// Deterministic verdicts for edits the harness made outside the conversation.
//
// A stage direction can have the harness rename a saved workflow behind the
// agent's back so the next save conflicts. Whether that edit SURVIVED is a fact
// about the saved workflow, not a judgement call, and the judge never sees the
// workflow name anyway — so it is measured here and rides along with the
// authored expectations.

import type { N8nClient } from '../clients/n8n-client';
import type { BuildExpectationResult, ExternalEditFact } from '../types';
import type { EvalLogger } from './logger';

/** Text of the verdict a rename produces, so reports and tests share one string. */
export function externalRenameSurvivedExpectation(to: string): string {
	return `The external rename to "${to}" survived: the workflow is still named "${to}" at the end of the run, so the agent re-applied its change onto the current saved state instead of overwriting it.`;
}

/**
 * One verdict per recorded external edit.
 *
 * Reads the workflow EAGERLY relative to build cleanup (the caller creates the
 * promise straight after the build; `--keep-workflows` off deletes the workflow
 * later), the same discipline as the credential-setup checks.
 *
 * An edit that never landed is not the agent's miss: it is reported as
 * incomplete with `framework_issue` so the case reads "this run did not
 * exercise the stale-state path" rather than "the agent failed".
 */
export async function runExternalEditChecks(options: {
	client: N8nClient;
	edits: ExternalEditFact[];
	logger: EvalLogger;
}): Promise<BuildExpectationResult[]> {
	const { client, edits, logger } = options;
	const verdicts: BuildExpectationResult[] = [];
	for (const edit of edits) {
		const expectation = externalRenameSurvivedExpectation(edit.to);
		if (!edit.applied || edit.workflowId === undefined) {
			verdicts.push({
				expectation,
				pass: false,
				incomplete: true,
				attribution: 'framework_issue',
				reason: `The harness did not apply the external rename after turn ${String(edit.turn)} (${edit.reason ?? 'no reason recorded'}), so the stale-state path was not exercised and this run does not measure it.`,
			});
			continue;
		}
		try {
			const workflow = await client.getWorkflow(edit.workflowId);
			const pass = workflow.name === edit.to;
			verdicts.push({
				expectation,
				pass,
				reason: pass
					? `Workflow ${edit.workflowId} is named "${workflow.name}" after the run; the rename applied after turn ${String(edit.turn)} was preserved.`
					: `Workflow ${edit.workflowId} is named "${workflow.name}" after the run, not "${edit.to}": the agent's save reverted the rename applied after turn ${String(edit.turn)}, so it overwrote state it never read.`,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(`  External-edit checks could not read ${edit.workflowId}: ${message}`);
			verdicts.push({
				expectation,
				pass: false,
				incomplete: true,
				attribution: 'framework_issue',
				reason: `Could not read workflow ${edit.workflowId} after the run: ${message}`,
			});
		}
	}
	return verdicts;
}
