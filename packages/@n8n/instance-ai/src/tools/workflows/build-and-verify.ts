import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

interface ReadyBuild {
	success: true;
	workItemId: string;
	workflowId: string;
}

/** A saved build that needs no setup first, so verification can run right away. */
function isReadyBuild(result: unknown): result is ReadyBuild & Record<string, unknown> {
	return (
		isRecord(result) &&
		result.success === true &&
		typeof result.workItemId === 'string' &&
		typeof result.workflowId === 'string' &&
		isRecord(result.verificationReadiness) &&
		result.verificationReadiness.status === 'ready' &&
		!(isRecord(result.setupRequirement) && result.setupRequirement.status === 'required')
	);
}

const VERIFIED_NOTE =
	'Verification already ran for this build; its result is in `verification`. Do not call verify-built-workflow again unless you change the workflow.';

/**
 * Node contracts: a successful build also runs verification, so the response carries the next
 * state and the agent saves a round trip. The verify tool stays available for later runs.
 */
export function withBuildVerification(build: BuiltTool, verify: BuiltTool | undefined): BuiltTool {
	const buildHandler = build.handler;
	const verifyHandler = verify?.handler;
	if (!buildHandler || !verifyHandler) return build;
	const outputSchema =
		build.outputSchema instanceof z.ZodObject
			? build.outputSchema.extend({
					verification: z.unknown().optional(),
					verificationNote: z.string().optional(),
				})
			: build.outputSchema;
	return {
		...build,
		description: `${build.description} A successful build also runs verification and returns it in \`verification\`.`,
		outputSchema,
		handler: async (input, ctx) => {
			const result = await buildHandler(input, ctx);
			if (!isReadyBuild(result)) return result;
			const verification = await verifyHandler(
				{ workItemId: result.workItemId, workflowId: result.workflowId },
				ctx,
			);
			return { ...result, verification, verificationNote: VERIFIED_NOTE };
		},
	};
}
