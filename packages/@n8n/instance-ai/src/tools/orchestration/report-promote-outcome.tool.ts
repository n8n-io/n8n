/**
 * Explicit completion signal for desktop-assistant promote runs. The promote
 * prompt instructs the orchestrator to end every run with exactly one call:
 * `success: true` with the main workflow's id when the build produced a
 * working workflow, `success: false` with a user-readable reason otherwise.
 * The desktop client's confirming promote call reads the persisted report off
 * thread metadata and settles the promote from it; a run that ends without a
 * report is treated as failed with a generic reason.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import {
	PROMOTE_RUN_ID_KEY,
	PROMOTED_BUILD_METADATA_KEY,
} from '../../desktop-assistant/promote-report';
import { patchThread, type PatchableThreadMemory } from '../../storage/thread-patch';

// Not a z.discriminatedUnion on `success`: the schema sanitizer flattens those
// and stringifies the discriminator's literals, so the model would send
// success as the string "true". The field pairing is enforced in the handler.
const inputSchema = sanitizeInputSchema(
	z.object({
		success: z
			.boolean()
			.describe('Whether the build produced a saved, working workflow. false for declines too'),
		workflowId: z
			.string()
			.trim()
			.min(1)
			.optional()
			.describe(
				'Required when success is true: id of the main workflow the build produced, exactly as returned by build-workflow. Never a supporting workflow’s id',
			),
		failureReason: z
			.string()
			.trim()
			.min(1)
			.optional()
			.describe(
				'Required when success is false. User-readable, one sentence: what blocked the build and what would unblock it',
			),
	}),
);

export function createReportPromoteOutcomeTool(deps: { memory?: PatchableThreadMemory }) {
	return new Tool('report-promote-outcome')
		.description(
			'Report how this promote run ended. Call exactly once, as the final tool call of the run: success with the main workflow id only when the workflow was saved and works, failure with a reason otherwise (including declines).',
		)
		.input(inputSchema)
		.handler(async (input, ctx) => {
			if (input.success && !input.workflowId) {
				return 'Error: a successful report requires workflowId. Call report-promote-outcome again with the main workflow’s id.';
			}
			if (!input.success && !input.failureReason) {
				return 'Error: a failure report requires failureReason. Call report-promote-outcome again with a one-sentence user-readable reason.';
			}

			const threadId = ctx.persistence?.threadId;
			if (!deps.memory || !threadId) {
				return 'Error: this run cannot record a promote outcome. End the run.';
			}

			// Unlike the plan tool's advisory persistence, this write IS the
			// completion signal — surface a failure so the model retries the call.
			try {
				await patchThread(deps.memory, {
					threadId,
					update: ({ metadata = {} }) => {
						// Stamp the promote endpoint's run marker, not ctx.runId — the agent
						// runtime mints its own run ids, which never match the service's.
						const promoteRunId = metadata[PROMOTE_RUN_ID_KEY];
						return {
							metadata: {
								...metadata,
								[PROMOTED_BUILD_METADATA_KEY]: {
									runId: typeof promoteRunId === 'string' ? promoteRunId : ctx.runId,
									success: input.success,
									...(input.success
										? { workflowId: input.workflowId }
										: { failureReason: input.failureReason }),
									reportedAt: new Date().toISOString(),
								},
							},
						};
					},
				});
			} catch {
				return 'Error: failed to record the promote outcome. Call report-promote-outcome again with the same arguments.';
			}

			return 'Promote outcome recorded. End the run now — do not call any other tool.';
		})
		.build();
}
