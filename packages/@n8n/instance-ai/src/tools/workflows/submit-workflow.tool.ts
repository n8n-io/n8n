/**
 * Submit Workflow Tool
 *
 * Executes a TypeScript workflow file in the sandbox via tsx to produce WorkflowJSON,
 * then validates it server-side and saves it to n8n. The sandbox handles TS transpilation
 * and module resolution natively — no AST interpreter restrictions.
 */

import { createTool } from '@mastra/core/tools';
import type { Workspace } from '@mastra/core/workspace';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { validateWorkflow } from '@n8n/workflow-sdk';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import type { ValidationWarning } from '../../workflow-builder';
import { partitionWarnings } from '../../workflow-builder';
import { escapeSingleQuotes, readFileViaSandbox, runInSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';

/**
 * Credential map passed from the orchestrator.
 * Keyed by credential type (e.g., "openAiApi", "gmailOAuth2", "slackApi").
 * The orchestrator builds this from `list-credentials` results.
 */
export type CredentialMap = Map<string, { id: string; name: string }>;

export interface SubmitWorkflowAttempt {
	filePath: string;
	sourceHash: string;
	success: boolean;
	errors?: string[];
}

function hashContent(content: string | null): string {
	return createHash('sha256')
		.update(content ?? '', 'utf8')
		.digest('hex');
}

/** Node types that require a webhookId for proper webhook path registration. */
const WEBHOOK_NODE_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
]);

/**
 * Ensure webhook nodes have a webhookId so n8n registers clean URL paths.
 * Without it, getNodeWebhookPath() falls back to encoding the node name
 * into the path (e.g., "{workflowId}/get%20%2Fdashboard/dashboard").
 *
 * For updates: preserves existing webhookIds from the current workflow so
 * webhook URLs remain stable. Only generates new IDs for new nodes.
 */
async function ensureWebhookIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	// For updates, read existing webhookIds so we don't change URLs
	const existingWebhookIds = new Map<string, string>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const node of existing.nodes ?? []) {
				if (node.webhookId && node.name) {
					existingWebhookIds.set(node.name, node.webhookId);
				}
			}
		} catch {
			// Can't fetch existing — will generate new IDs
		}
	}

	for (const node of json.nodes ?? []) {
		if (WEBHOOK_NODE_TYPES.has(node.type) && !node.webhookId) {
			// Reuse existing webhookId if this node name existed before
			node.webhookId = (node.name && existingWebhookIds.get(node.name)) ?? randomUUID();
		}
	}
}

function enhanceValidationErrors(errors: string[]): string[] {
	const needsHtmlGuidance = errors.some(
		(error) => error.includes('[MISSING_EXPRESSION_PREFIX]') && error.includes('parameter "html"'),
	);

	if (!needsHtmlGuidance) return errors;

	return [
		...errors,
		'HTML node guidance: do not embed bare {{ $json... }} inside a large HTML string. Build the final HTML in a Code node and inject serialized/base64 data there, or make the entire parameter an expression string starting with =.',
	];
}

function enhanceBuildErrors(errors: string[]): string[] {
	const needsTemplateGuidance = errors.some((error) => {
		const normalized = error.toLowerCase();
		return (
			normalized.includes('unterminated template') ||
			normalized.includes('unexpected end of input') ||
			normalized.includes('unexpected identifier') ||
			normalized.includes('unexpected token') ||
			normalized.includes('expected unicode escape') ||
			normalized.includes('missing ) after argument list')
		);
	});

	if (!needsTemplateGuidance) return errors;

	return [
		...errors,
		'Code node guidance: for large HTML, write it to a separate file (e.g., chunks/page.html), then in your SDK TypeScript use readFileSync + JSON.stringify to safely embed it. NEVER embed large HTML directly in jsCode. See the web_app_pattern in your instructions.',
	];
}

/**
 * Resolve undefined/null credentials in the workflow JSON.
 *
 * `newCredential()` produces `NewCredentialImpl` which serializes to `undefined`
 * in `toJSON()`. Resolution strategy (in order):
 * 1. Match by credential type from the credential map (orchestrator = source of truth)
 * 2. Restore from the existing workflow (for update flows)
 * 3. Delete the key (user adds it in the UI later)
 */
async function resolveCredentials(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
	credentialMap: CredentialMap,
): Promise<void> {
	// Build a map of existing credentials by node name (for updates)
	const existingCredsByNode = new Map<string, Record<string, unknown>>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const existingNode of existing.nodes ?? []) {
				if (existingNode.credentials && existingNode.name) {
					existingCredsByNode.set(
						existingNode.name,
						existingNode.credentials as Record<string, unknown>,
					);
				}
			}
		} catch {
			// Can't fetch existing — will try other strategies
		}
	}

	for (const node of json.nodes ?? []) {
		if (!node.credentials) continue;
		const creds = node.credentials as Record<string, unknown>;

		for (const [key, value] of Object.entries(creds)) {
			if (value !== undefined && value !== null) continue;

			// Try 1: look up by credential type from the map (e.g., key="openAiApi")
			const fromMap = credentialMap.get(key);
			if (fromMap) {
				creds[key] = fromMap;
				continue;
			}

			// Try 2: restore from existing workflow (for nodes that already existed)
			const existingCreds = node.name ? existingCredsByNode.get(node.name) : undefined;
			if (existingCreds?.[key]) {
				creds[key] = existingCreds[key];
				continue;
			}

			// Unresolved — remove to prevent "Cannot read properties of undefined (reading 'id')"
			// The user can add the credential in the n8n UI later.

			delete creds[key];
		}
	}
}

export function createSubmitWorkflowTool(
	context: InstanceAiContext,
	workspace: Workspace,
	credentialMap: CredentialMap = new Map(),
	onAttempt?: (attempt: SubmitWorkflowAttempt) => void,
) {
	return createTool({
		id: 'submit-workflow',
		description:
			'Submit a workflow from a TypeScript file in the sandbox. Reads the file, validates it, ' +
			'and saves it to n8n. Sub-workflows (those with only an executeWorkflowTrigger) are ' +
			'automatically activated so they can be called by executeWorkflow nodes.',
		inputSchema: z.object({
			filePath: z
				.string()
				.optional()
				.describe('Path to the TypeScript workflow file (default: ~/workspace/src/workflow.ts)'),
			workflowId: z
				.string()
				.optional()
				.describe('Existing workflow ID to update (omit to create new)'),
			name: z.string().optional().describe('Workflow name (required for new workflows)'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			workflowId: z.string().optional(),
			activated: z.boolean().optional(),
			errors: z.array(z.string()).optional(),
			warnings: z.array(z.string()).optional(),
		}),
		execute: async ({ filePath: rawFilePath, workflowId, name }) => {
			// Resolve file path: relative paths resolve against workspace root, ~ is expanded
			const root = await getWorkspaceRoot(workspace);
			let filePath: string;
			if (!rawFilePath) {
				filePath = `${root}/src/workflow.ts`;
			} else if (rawFilePath.startsWith('~/')) {
				filePath = `${root.replace(/\/workspace$/, '')}/${rawFilePath.slice(2)}`;
			} else if (!rawFilePath.startsWith('/')) {
				filePath = `${root}/${rawFilePath}`;
			} else {
				filePath = rawFilePath;
			}

			const sourceHash = hashContent(await readFileViaSandbox(workspace, filePath));
			const reportAttempt = (attempt: Omit<SubmitWorkflowAttempt, 'filePath' | 'sourceHash'>) => {
				onAttempt?.({
					filePath,
					sourceHash,
					...attempt,
				});
			};

			// Execute the TS file in the sandbox via tsx to produce WorkflowJSON.
			// Node.js module resolution handles local imports naturally (no manual bundling).
			const buildResult = await runInSandbox(
				workspace,
				`node --import tsx build.mjs '${escapeSingleQuotes(filePath)}'`,
				root,
			);

			// Parse structured JSON output from build.mjs
			let buildOutput: {
				success: boolean;
				workflow?: WorkflowJSON;
				warnings?: Array<{ code: string; message: string; nodeName?: string }>;
				errors?: string[];
			};
			try {
				// build.mjs writes JSON to stdout; strip any non-JSON lines (e.g. tsx warnings)
				const stdout = buildResult.stdout.trim();
				const lastLine = stdout.split('\n').pop() ?? '';
				buildOutput = JSON.parse(lastLine) as typeof buildOutput;
			} catch {
				// If we can't parse the output, return the raw stderr/stdout as error context
				const errors = [
					`Failed to execute workflow file in sandbox (exit code ${buildResult.exitCode}).`,
					buildResult.stderr?.trim() || buildResult.stdout?.trim() || 'No output',
				];
				reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			if (!buildOutput.success || !buildOutput.workflow) {
				const errors = enhanceBuildErrors(buildOutput.errors ?? ['Unknown build error']);
				reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			// Collect structural warnings from sandbox (graph validation)
			const allWarnings: ValidationWarning[] = (buildOutput.warnings ?? []).map((w) => ({
				code: w.code,
				message: w.message,
				nodeName: w.nodeName,
			}));

			// Server-side schema validation (Zod checks against node type definitions)
			const schemaValidation = validateWorkflow(buildOutput.workflow);
			for (const issue of [...schemaValidation.errors, ...schemaValidation.warnings]) {
				allWarnings.push({
					code: issue.code,
					message: issue.message,
					nodeName: issue.nodeName,
				});
			}

			const { errors, informational } = partitionWarnings(allWarnings);

			if (errors.length > 0) {
				const formattedErrors = enhanceValidationErrors(
					errors.map((e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`),
				);
				reportAttempt({ success: false, errors: formattedErrors });
				return {
					success: false,
					errors: formattedErrors,
					warnings:
						informational.length > 0
							? informational.map((w) => `[${w.code}]: ${w.message}`)
							: undefined,
				};
			}

			// Override name if provided
			const json = buildOutput.workflow;
			if (name) {
				json.name = name;
			} else if (!json.name && !workflowId) {
				const errors = [
					'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
				];
				reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined in toJSON().
			// For updates: restore from the existing workflow's resolved credentials.
			// For new nodes: look up credentials by name from the credential service.
			await resolveCredentials(json, workflowId, context, credentialMap);

			// Ensure webhook nodes have a webhookId so n8n registers clean paths
			// (e.g., "{uuid}/dashboard" instead of "{workflowId}/{encodedNodeName}/dashboard").
			// The SDK's toJSON() doesn't emit webhookId, so we inject it here.
			await ensureWebhookIds(json, workflowId, context);

			// Save
			let savedId: string;
			try {
				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(workflowId, json);
					savedId = updated.id;
				} else {
					const created = await context.workflowService.createFromWorkflowJSON(json);
					savedId = created.id;
				}
			} catch (error) {
				const errors = [
					`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				];
				reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			// Auto-activate sub-workflows: if the only trigger is executeWorkflowTrigger,
			// this is a sub-workflow meant to be called by executeWorkflow nodes.
			// It must be active for composition to work.
			const EXECUTE_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';
			let activated = false;
			const triggers = (json.nodes ?? []).filter(
				(n) =>
					n.type === EXECUTE_WORKFLOW_TRIGGER ||
					n.type?.endsWith?.('Trigger') ||
					n.type?.endsWith?.('trigger'),
			);
			const isSubWorkflow =
				triggers.length > 0 && triggers.every((t) => t.type === EXECUTE_WORKFLOW_TRIGGER);

			if (isSubWorkflow) {
				// For newly created workflows, activation may fail if the version history
				// hasn't been committed yet. Retry once after a short delay.
				let activationError: string | undefined;
				for (let attempt = 0; attempt < 2 && !activated; attempt++) {
					try {
						if (attempt > 0) {
							await new Promise((resolve) => setTimeout(resolve, 500));
						}
						await context.workflowService.activate(savedId);
						activated = true;
					} catch (error) {
						activationError = error instanceof Error ? error.message : 'Unknown activation error';
					}
				}
				if (!activated && activationError) {
					informational.push({
						code: 'ACTIVATION_FAILED',
						message: `Sub-workflow auto-activation failed: ${activationError}. Call activate-workflow explicitly after verifying the workflow.`,
					});
				}
			}

			reportAttempt({ success: true });
			return {
				success: true,
				workflowId: savedId,
				workflowName: json.name || undefined,
				activated: activated || undefined,
				warnings:
					informational.length > 0
						? informational.map((w) => `[${w.code}]: ${w.message}`)
						: undefined,
			};
		},
	});
}
