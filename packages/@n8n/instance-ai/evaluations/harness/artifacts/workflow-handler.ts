// ---------------------------------------------------------------------------
// Workflow artifact handler — a faithful wrapper over the existing
// eval-harness discovery/fetch/render functions. Behavior is byte-identical
// to the pre-registry code path; this just gives it a uniform shape so
// agent/config-eval handlers can register alongside it.
// ---------------------------------------------------------------------------

import { ALL_CHECKS } from '../../binaryChecks/checks';
import type { WorkflowResponse } from '../../clients/n8n-client';
import { extractWorkflowIdsFromMessages } from '../../outcome/workflow-discovery';
import { buildWorkflowContextBlock } from '../workflow-context';
import type { ArtifactHandler } from './types';

export const workflowHandler: ArtifactHandler<WorkflowResponse> = {
	type: 'workflow',
	runsExecutionScenarios: true,
	discover(ctx) {
		// Workflow keeps its richer message-based discovery (tool results + targetResource).
		return extractWorkflowIdsFromMessages(ctx.messages ?? []).map((id) => ({
			type: 'workflow',
			id,
		}));
	},
	async fetch(ref, client) {
		return await client.getWorkflow(ref.id);
	},
	renderArtifact(wf) {
		return buildWorkflowContextBlock(wf);
	},
	// Canonical descriptor of the workflow type's checks. Not yet consumed by the
	// runner (it still runs checks via runBinaryChecks); rerouting through the
	// handler is a future step.
	binaryChecks: ALL_CHECKS,
};
