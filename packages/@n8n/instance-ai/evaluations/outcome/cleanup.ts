// ---------------------------------------------------------------------------
// Cleanup: delete workflows and credentials created during an eval run
// ---------------------------------------------------------------------------

import type { N8nClient } from '../clients/n8n-client';
import type { AgentOutcome } from '../types';

// ---------------------------------------------------------------------------
// cleanupAll
//
// Best-effort deletion of all workflows and credentials produced by a run.
// Errors are swallowed so a cleanup failure never masks the eval result.
// ---------------------------------------------------------------------------

export async function cleanupAll(
	client: N8nClient,
	outcome: AgentOutcome,
	credentialIds: string[],
): Promise<void> {
	// Delete workflows
	for (const wf of outcome.workflowsCreated) {
		try {
			await client.deleteWorkflow(wf.id);
		} catch {
			// Best-effort cleanup -- ignore failures
		}
	}

	// Delete credentials
	for (const id of credentialIds) {
		try {
			await client.deleteCredential(id);
		} catch {
			// Best-effort cleanup -- ignore failures
		}
	}
}
