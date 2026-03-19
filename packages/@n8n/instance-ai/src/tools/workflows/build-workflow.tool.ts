import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { resolveCredentials, type CredentialMap } from './resolve-credentials';
import type { InstanceAiContext } from '../../types';
import { parseAndValidate, partitionWarnings } from '../../workflow-builder';
import { extractWorkflowCode } from '../../workflow-builder/extract-code';
import { applyPatches } from '../../workflow-builder/patch-code';

const patchSchema = z.object({
	old_str: z.string().describe('Exact string to find in the code'),
	new_str: z.string().describe('Replacement string'),
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
		inputSchema: z.object({
			code: z
				.string()
				.optional()
				.describe(
					'Full TypeScript workflow code using @n8n/workflow-sdk. Required for new workflows.',
				),
			patches: z
				.array(patchSchema)
				.optional()
				.describe(
					'Array of {old_str, new_str} replacements to apply to existing workflow code. ' +
						'Requires workflowId. More efficient than resending full code for small fixes.',
				),
			workflowId: z
				.string()
				.optional()
				.describe('Existing workflow ID to update (omit to create new)'),
			projectId: z
				.string()
				.optional()
				.describe('Project ID to create the workflow in. Defaults to personal project.'),
			name: z.string().optional().describe('Workflow name (required for new workflows)'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			workflowId: z.string().optional(),
			errors: z.array(z.string()).optional(),
			warnings: z.array(z.string()).optional(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { code, patches, workflowId, projectId, name } = input;
			const { resumeData, suspend } = ctx?.agent ?? {};
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
				result = parseAndValidate(finalCode);
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

			// Override name if provided
			const json = result.workflow;
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

			const needsApproval = context.permissions?.buildWorkflow !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: workflowId
						? `Update workflow "${workflowId}" from SDK code?`
						: `Create new workflow "${json.name ?? ''}" from SDK code?`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — save

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined.
			// Build a credential map from available credentials and resolve them.
			const credentialMap: CredentialMap = new Map();
			try {
				const allCreds = await context.credentialService.list();
				for (const cred of allCreds) {
					credentialMap.set(cred.type, { id: cred.id, name: cred.name });
				}
			} catch {
				// Non-fatal — credentials will be unresolved (user adds in UI)
			}
			const mockResult = await resolveCredentials(json, workflowId, context, credentialMap);

			if (mockResult.mockedNodeNames.length > 0) {
				informational.push({
					code: 'CREDENTIALS_MOCKED',
					message: `Mocked ${mockResult.mockedCredentialTypes.join(', ')} via pinned data on nodes: ${mockResult.mockedNodeNames.join(', ')}. Add real credentials before activating.`,
				});
			}

			try {
				const opts = projectId ? { projectId } : undefined;
				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						workflowId,
						json,
						opts,
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
					const created = await context.workflowService.createFromWorkflowJSON(json, opts);
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
