import { createTool } from '@mastra/core/tools';
import { generateWorkflowCode, layoutWorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import { buildCredentialMap, resolveCredentials } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import { ensureWebhookIds } from './submit-workflow.tool';
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { extractWorkflowCode } from '../../workflow-builder/extract-code';
import { applyPatches } from '../../workflow-builder/patch-code';

const patchSchema = z.object({
	old_str: z.string().describe('Exact string to find in the code'),
	new_str: z.string().describe('Replacement string'),
});

// Coerce JSON-stringified arrays into arrays. The model sometimes sends `patches`
// as a JSON string because the payload contains escaped code. Leave non-strings
// untouched so Zod can validate them normally.
function coercePatches(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export const buildWorkflowInputSchema = z.object({
	code: z
		.string()
		.optional()
		.describe('Full TypeScript workflow code using @n8n/workflow-sdk. Required for new workflows.'),
	patches: z
		.preprocess(coercePatches, z.array(patchSchema))
		.optional()
		.describe(
			'Array of {old_str, new_str} replacements to apply to existing workflow code. ' +
				'Requires workflowId. More efficient than resending full code for small fixes.',
		),
	workflowId: z.string().optional().describe('Existing workflow ID to update (omit to create new)'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to create the workflow in. Defaults to personal project.'),
	name: z.string().optional().describe('Workflow name (required for new workflows)'),
});

export function createBuildWorkflowTool(context: InstanceAiContext) {
	// Keeps the last code submitted (or patched) so patches work even before save,
	// and always match the LLM's own code — not a roundtripped version.
	let lastCode: string | null = null;

	return createTool({
		id: 'build-workflow',
		description:
			'Build a workflow from TypeScript SDK code. Two modes:\n' +
			'1. Full code: pass `code` to create/update a workflow from scratch.\n' +
			'2. Patch mode: pass `patches` (+ optional `workflowId`) to apply str_replace fixes. ' +
			'Patches apply to last submitted code, or auto-fetch from saved workflow if workflowId given.',
		inputSchema: buildWorkflowInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			workflowId: z.string().optional(),
			errors: z.array(z.string()).optional(),
			warnings: z.array(z.string()).optional(),
		}),
		execute: async (input: z.infer<typeof buildWorkflowInputSchema>) => {
			const permKey = input.workflowId ? 'updateWorkflow' : 'createWorkflow';
			if (context.permissions?.[permKey] === 'blocked') {
				return { success: false, errors: ['Action blocked by admin'] };
			}

			const { code, patches, workflowId, projectId, name } = input;
			let finalCode: string;

			if (patches) {
				// Patch mode: apply str_replace to existing code.
				// Source priority: lastCode (same session) → fetch from backend (cross-session)
				let baseCode = lastCode;
				if (!baseCode && workflowId) {
					try {
						const json = await context.workflowService.getAsWorkflowJSON(workflowId);
						baseCode = generateWorkflowCode(json);
						lastCode = baseCode; // Sync so future patches match this code
					} catch {
						return {
							success: false,
							errors: [
								'Patch mode: no previous code and could not fetch workflow. Send full code instead.',
							],
						};
					}
				}
				if (!baseCode) {
					return {
						success: false,
						errors: [
							'Patch mode requires either a previous build-workflow call or a workflowId to fetch from.',
						],
					};
				}

				const patchResult = applyPatches(baseCode, patches);
				if (!patchResult.success) {
					return { success: false, errors: [patchResult.error] };
				}

				finalCode = patchResult.code;
			} else if (code) {
				finalCode = extractWorkflowCode(code);
			} else {
				return {
					success: false,
					errors: ['Either `code` (full code) or `patches` (to fix previous code) is required.'],
				};
			}

			// Remember for future patches
			lastCode = finalCode;

			// Parse TypeScript to WorkflowJSON with two-stage validation
			let result;
			try {
				result = parseAndValidate(finalCode, {
					nodeTypesProvider: context.nodeTypesProvider,
				});
			} catch (error) {
				return {
					success: false,
					errors: [error instanceof Error ? error.message : 'Failed to parse workflow code'],
				};
			}

			// Partition validation results into blocking errors and informational warnings
			const { errors, informational } = partitionWarnings(result.warnings);

			if (errors.length > 0) {
				return {
					success: false,
					errors: errors.map(
						(e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`,
					),
					warnings:
						informational.length > 0
							? informational.map((w) => `[${w.code}]: ${w.message}`)
							: undefined,
				};
			}

			// Apply Dagre layout to produce positions matching the FE's tidy-up.
			// Temporary: remove once the SDK is published with toJSON({ tidyUp: true }).
			const json = layoutWorkflowJSON(result.workflow);
			if (name) {
				json.name = name;
			} else if (!json.name && !workflowId) {
				return {
					success: false,
					errors: [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					],
				};
			}

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined.
			const credentialMap = await buildCredentialMap(context.credentialService);
			await resolveCredentials(json, workflowId, context, credentialMap);

			// Strip credential entries that are no longer valid for the current
			// parameters. Resolution above (and the LLM itself) can re-emit stale
			// references between turns; without this, setup analysis would surface
			// a credential request for a node that no longer needs one.
			await stripStaleCredentialsFromWorkflow(context, json);

			// Ensure webhook nodes have a webhookId so n8n registers clean paths
			await ensureWebhookIds(json, workflowId, context);

			try {
				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						workflowId,
						json,
						projectId ? { projectId } : undefined,
					);
					return {
						success: true,
						workflowId: updated.id,
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				} else {
					const created = await context.workflowService.createFromWorkflowJSON(json, {
						...(projectId ? { projectId } : {}),
						markAsAiTemporary: true,
					});
					(context.aiCreatedWorkflowIds ??= new Set<string>()).add(created.id);
					return {
						success: true,
						workflowId: created.id,
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				}
			} catch (error) {
				return {
					success: false,
					errors: [
						`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					],
				};
			}
		},
	});
}
