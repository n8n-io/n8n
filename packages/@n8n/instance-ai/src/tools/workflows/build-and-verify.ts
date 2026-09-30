import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { resolvedCredentialSchema } from './resolved-credential.schema';
import { REVERIFY_DESCRIPTION, reverifyInputSchema } from './reverify-description';

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

const credentialsByNodeSchema = z.record(z.array(resolvedCredentialSchema));

const VERIFIED_NOTE =
	'Verification already ran for this build; its result is in `verification`. Do not call verify-built-workflow again unless you change the workflow.';

/** Node contracts: the build already verifies, so the verify tool only describes a re-run. */
export function asReverifyTool(verify: BuiltTool): BuiltTool {
	return {
		...verify,
		description: REVERIFY_DESCRIPTION,
		inputSchema: reverifyInputSchema(verify.inputSchema),
	};
}

function withoutNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutNulls);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, field]) => field !== null && field !== undefined)
			.map(([key, field]) => [key, withoutNulls(field)]),
	);
}

/** True when the preview holds only empty items, e.g. `[{}]`. */
function isEmptyPreview(preview: unknown): boolean {
	if (!isRecord(preview) || preview.truncated === true || typeof preview.preview !== 'string') {
		return false;
	}
	const body = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/.exec(
		preview.preview,
	)?.[1];
	try {
		const items: unknown = JSON.parse(body ?? preview.preview);
		return (
			Array.isArray(items) && items.every((item) => isRecord(item) && !Object.keys(item).length)
		);
	} catch {
		return false;
	}
}

function compactVerification(verification: unknown, workItemId: unknown): unknown {
	if (!isRecord(verification)) return verification;
	const claimHasSimulatedNodes =
		isRecord(verification.claim) && Array.isArray(verification.claim.simulatedNodes);
	return Object.fromEntries(
		Object.entries(verification).flatMap(([key, field]): Array<[string, unknown]> => {
			if (key === 'simulatedNodes' && claimHasSimulatedNodes) return [];
			if (key === 'resolvedWorkItemId' && field === workItemId) return [];
			// Keep empty outputs of a failed run; they can explain the failure.
			if (key === 'nodePreviews' && verification.success === true && Array.isArray(field)) {
				return [[key, field.filter((preview) => !isEmptyPreview(preview))]];
			}
			return [[key, field]];
		}),
	);
}

/** One sentence for stored credentials only; other notes carry setup steps, so they stay. */
function compactCredentialNote(note: unknown, credentialsByNode: unknown): unknown {
	const parsed = credentialsByNodeSchema.safeParse(credentialsByNode);
	if (
		typeof note !== 'string' ||
		!note.startsWith('Connected existing credential(s) automatically:') ||
		!parsed.success
	) {
		return note;
	}
	const entries = Object.entries(parsed.data);
	if (entries.some(([, credentials]) => credentials.some(({ id }) => id === null))) return note;
	const attached = entries.flatMap(([nodeName, credentials]) =>
		credentials.map(({ name }) => `"${name}" on "${nodeName}"`),
	);
	return `Already set up, do not route to setup: ${attached.join('; ')}.`;
}

function compactSuccessField(
	key: string,
	field: unknown,
	result: Record<string, unknown>,
): Array<[string, unknown]> {
	switch (key) {
		case 'sourceHash':
		case 'verificationNote':
			return [];
		case 'grouping':
			return isRecord(field) && field.decision === 'under_ceiling' ? [] : [[key, field]];
		case 'postBuildFlow':
			// The anchored skill carries the rules, so the guidance text only repeats them.
			return isRecord(field) &&
				typeof field.skillId === 'string' &&
				field.instructions === `Follow the active ${field.skillId} skill instructions.`
				? [[key, { required: field.required, skillId: field.skillId }]]
				: [[key, field]];
		case 'publishState': {
			if (!isRecord(field) || typeof field.live !== 'string') return [[key, field]];
			const note = result.publishStateNote;
			return [
				[
					'live',
					field.live === 'unpublished' || typeof note !== 'string'
						? field.live
						: `${field.live}: ${note}`,
				],
			];
		}
		case 'publishStateNote':
			return isRecord(result.publishState) && typeof result.publishState.live === 'string'
				? []
				: [[key, field]];
		case 'credentialResolutionNote':
			return [[key, compactCredentialNote(field, result.resolvedCredentialsByNode)]];
		case 'verification':
			return [[key, compactVerification(field, result.workItemId)]];
		default:
			return [[key, field]];
	}
}

/** Model view of a build result. The stored result keeps every field. */
export function toBuildModelOutput(output: unknown): unknown {
	const result = withoutNulls(output);
	if (!isRecord(result) || result.success !== true) return result;
	return Object.fromEntries(
		Object.entries(result).flatMap(([key, field]) => compactSuccessField(key, field, result)),
	);
}

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
		description: `${build.description} A successful build also runs verification and returns it in \`verification\`; verify again only after a change.`,
		outputSchema,
		toModelOutput: (output) =>
			toBuildModelOutput(build.toModelOutput ? build.toModelOutput(output) : output),
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
