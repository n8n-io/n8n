/**
 * Submit Workflow Tool
 *
 * Executes a TypeScript workflow file in the sandbox via tsx to produce WorkflowJSON,
 * then validates it server-side and saves it to n8n. The sandbox handles TS transpilation
 * and module resolution natively — no AST interpreter restrictions.
 */

import { createTool } from '@mastra/core/tools';
import type { Workspace } from '@mastra/core/workspace';
import { hasPlaceholderDeep } from '@n8n/utils';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { validateWorkflow, layoutWorkflowJSON } from '@n8n/workflow-sdk';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

import { resolveCredentials, type CredentialMap } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import type { InstanceAiContext } from '../../types';
import type { ValidationWarning } from '../../workflow-builder';
import { partitionWarnings } from '../../workflow-builder';
import { escapeSingleQuotes, readFileViaSandbox, runInSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';

export interface SubmitWorkflowAttempt {
	filePath: string;
	sourceHash: string;
	success: boolean;
	/** Workflow ID assigned by n8n after a successful save. */
	workflowId?: string;
	/** Node types of all trigger nodes in the submitted workflow. */
	triggerNodeTypes?: string[];
	/** Node names whose credentials were mocked. */
	mockedNodeNames?: string[];
	/** Credential types that were mocked (not resolved to real credentials). */
	mockedCredentialTypes?: string[];
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode?: Record<string, string[]>;
	/** Verification-only pin data — scoped to this build, never persisted to workflow. */
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	/** Whether any node parameters contain unresolved placeholder values. */
	hasUnresolvedPlaceholders?: boolean;
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
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

/**
 * Ensure webhook nodes have a webhookId so n8n registers clean URL paths.
 * Without it, getNodeWebhookPath() falls back to encoding the node name
 * into the path (e.g., "{workflowId}/get%20%2Fdashboard/dashboard").
 *
 * For updates: preserves existing webhookIds from the current workflow so
 * webhook URLs remain stable. Only generates new IDs for new nodes.
 */
export async function ensureWebhookIds(
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

// Re-export from shared module for backward compatibility
export {
	buildCredentialMap,
	resolveCredentials,
	type CredentialMap,
	type CredentialResolutionResult,
} from './resolve-credentials';

export const submitWorkflowInputSchema = z.object({
	filePath: z
		.string()
		.optional()
		.describe('Path to the TypeScript workflow file (default: ~/workspace/src/workflow.ts)'),
	workflowId: z.string().optional().describe('Existing workflow ID to update (omit to create new)'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to create the workflow in. Defaults to personal project.'),
	name: z.string().optional().describe('Workflow name (required for new workflows)'),
});

export function createSubmitWorkflowTool(
	context: InstanceAiContext,
	workspace: Workspace,
	credentialMap: CredentialMap = new Map(),
	onAttempt?: (attempt: SubmitWorkflowAttempt) => void | Promise<void>,
) {
	return createTool({
		id: 'submit-workflow',
		description:
			'Submit a workflow from a TypeScript file in the sandbox. Reads the file, validates it, ' +
			'and saves it to n8n as a draft. The workflow must be explicitly published via ' +
			'publish-workflow before it will run on its triggers in production.',
		inputSchema: submitWorkflowInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			workflowId: z.string().optional(),
			/** Node names whose credentials were mocked via pinned data. */
			mockedNodeNames: z.array(z.string()).optional(),
			/** Credential types that were mocked (not resolved to real credentials). */
			mockedCredentialTypes: z.array(z.string()).optional(),
			/** Map of node name → credential types that were mocked on that node. */
			mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
			/** Verification-only pin data — scoped to this build, never persisted to workflow. */
			verificationPinData: z.record(z.array(z.record(z.unknown()))).optional(),
			errors: z.array(z.string()).optional(),
			warnings: z.array(z.string()).optional(),
		}),
		execute: async ({
			filePath: rawFilePath,
			workflowId,
			projectId,
			name,
		}: z.infer<typeof submitWorkflowInputSchema>) => {
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
			const reportAttempt = async (
				attempt: Omit<SubmitWorkflowAttempt, 'filePath' | 'sourceHash'>,
			) => {
				await onAttempt?.({
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
				await reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			if (!buildOutput.success || !buildOutput.workflow) {
				const errors = enhanceBuildErrors(buildOutput.errors ?? ['Unknown build error']);
				await reportAttempt({ success: false, errors });
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
				await reportAttempt({ success: false, errors: formattedErrors });
				return {
					success: false,
					errors: formattedErrors,
					warnings:
						informational.length > 0
							? informational.map((w) => `[${w.code}]: ${w.message}`)
							: undefined,
				};
			}

			// Apply Dagre layout to produce positions matching the FE's tidy-up.
			// Temporary: until the SDK is published with toJSON({ tidyUp: true }) support,
			// the sandbox's SDK doesn't have Dagre layout, so we apply it server-side.
			const json = layoutWorkflowJSON(buildOutput.workflow);
			if (name) {
				json.name = name;
			} else if (!json.name && !workflowId) {
				const errors = [
					'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
				];
				await reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			// Resolve undefined/null credentials before saving.
			// newCredential() produces NewCredentialImpl which serializes to undefined in toJSON().
			// For updates: restore from the existing workflow's resolved credentials.
			// For new nodes: look up credentials by name from the credential service.
			// Unresolved credentials are mocked via pinned data when available.
			const mockResult = await resolveCredentials(json, workflowId, context, credentialMap);

			// Strip credential entries that are no longer valid for the current
			// parameters. Resolution above (and the LLM itself) can re-emit stale
			// references between turns; without this, setup analysis would surface
			// a credential request for a node that no longer needs one.
			await stripStaleCredentialsFromWorkflow(context, json);

			// Ensure webhook nodes have a webhookId so n8n registers clean paths
			// (e.g., "{uuid}/dashboard" instead of "{workflowId}/{encodedNodeName}/dashboard").
			// The SDK's toJSON() doesn't emit webhookId, so we inject it here.
			await ensureWebhookIds(json, workflowId, context);

			// Save
			let savedId: string;
			const opts = projectId ? { projectId } : undefined;
			try {
				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						workflowId,
						json,
						opts,
					);
					savedId = updated.id;
				} else {
					const created = await context.workflowService.createFromWorkflowJSON(json, opts);
					savedId = created.id;
				}
			} catch (error) {
				const errors = [
					`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				];
				await reportAttempt({ success: false, errors });
				return {
					success: false,
					errors,
				};
			}

			const hasMockedCredentials = mockResult.mockedNodeNames.length > 0;

			// Add mock summary warning when credentials were mocked
			if (hasMockedCredentials) {
				informational.push({
					code: 'CREDENTIALS_MOCKED',
					message: `Mocked ${mockResult.mockedCredentialTypes.join(', ')} via pinned data on nodes: ${mockResult.mockedNodeNames.join(', ')}. Add real credentials before publishing.`,
				});
			}

			const triggers = (json.nodes ?? []).filter(
				(n) => n.type?.endsWith?.('Trigger') || n.type?.endsWith?.('trigger'),
			);
			const triggerNodeTypes = triggers.map((t) => t.type).filter(Boolean);

			// Scan node parameters for unresolved placeholder values
			const hasPlaceholders = (json.nodes ?? []).some((n) => hasPlaceholderDeep(n.parameters));

			await reportAttempt({
				success: true,
				workflowId: savedId,
				triggerNodeTypes,
				mockedNodeNames: hasMockedCredentials ? mockResult.mockedNodeNames : undefined,
				mockedCredentialTypes: hasMockedCredentials ? mockResult.mockedCredentialTypes : undefined,
				mockedCredentialsByNode: hasMockedCredentials
					? mockResult.mockedCredentialsByNode
					: undefined,
				verificationPinData:
					hasMockedCredentials && Object.keys(mockResult.verificationPinData).length > 0
						? mockResult.verificationPinData
						: undefined,
				hasUnresolvedPlaceholders: hasPlaceholders || undefined,
			});
			return {
				success: true,
				workflowId: savedId,
				workflowName: json.name || undefined,
				mockedNodeNames: hasMockedCredentials ? mockResult.mockedNodeNames : undefined,
				mockedCredentialTypes: hasMockedCredentials ? mockResult.mockedCredentialTypes : undefined,
				mockedCredentialsByNode: hasMockedCredentials
					? mockResult.mockedCredentialsByNode
					: undefined,
				verificationPinData:
					hasMockedCredentials && Object.keys(mockResult.verificationPinData).length > 0
						? mockResult.verificationPinData
						: undefined,
				warnings:
					informational.length > 0
						? informational.map((w) => `[${w.code}]: ${w.message}`)
						: undefined,
			};
		},
	});
}
