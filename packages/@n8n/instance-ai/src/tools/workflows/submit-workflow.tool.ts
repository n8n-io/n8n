/**
 * Submit Workflow Tool
 *
 * Executes a TypeScript workflow file in the sandbox via tsx to produce WorkflowJSON,
 * then validates it server-side and saves it to n8n. The sandbox handles TS transpilation
 * and module resolution natively — no AST interpreter restrictions.
 */

import { Tool } from '@n8n/agents';
import { hasPlaceholderDeep } from '@n8n/utils';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { validateWorkflow } from '@n8n/workflow-sdk';
import type { WorkflowStructureIssue } from 'n8n-workflow';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

import { resolveCredentials, type CredentialMap } from './resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from './setup-workflow.service';
import { getReferencedWorkflowIds, isTriggerNodeType } from './workflow-json-utils';
import type { InstanceAiContext } from '../../types';
import type { ValidationWarning } from '../../workflow-builder';
import { partitionWarnings } from '../../workflow-builder';
import { createRemediation } from '../../workflow-loop/remediation';
import type { RemediationMetadata } from '../../workflow-loop/workflow-loop-state';
import {
	escapeSingleQuotes,
	readFileViaSandbox,
	runInSandbox,
	type SandboxWorkspace,
} from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';

export interface SubmitWorkflowAttempt {
	filePath: string;
	sourceHash: string;
	success: boolean;
	/** Workflow ID assigned by n8n after a successful save. */
	workflowId?: string;
	/**
	 * Trigger nodes in the submitted workflow, each carrying name + type.
	 * Populated by a conservative detector (known-mockable allow-list plus
	 * any node type ending in `Trigger`); surfaces to the build outcome so
	 * the orchestrator can choose a `verify-built-workflow` `inputData` shape.
	 */
	triggerNodes?: Array<{ nodeName: string; nodeType: string }>;
	/** Node names whose credentials were mocked. */
	mockedNodeNames?: string[];
	/** Credential types that were mocked (not resolved to real credentials). */
	mockedCredentialTypes?: string[];
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode?: Record<string, string[]>;
	/** Verification-only pin data — scoped to this build, never persisted to workflow. */
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	/** True when mocked credential nodes can be skipped by existing workflow-level pin data. */
	usesWorkflowPinDataForVerification?: boolean;
	/** Sub-workflow IDs referenced by the submitted main workflow. */
	referencedWorkflowIds?: string[];
	/** Whether any node parameters contain unresolved placeholder values. */
	hasUnresolvedPlaceholders?: boolean;
	remediation?: RemediationMetadata;
	errors?: string[];
	errorDetails?: SubmitWorkflowErrorDetail[];
	nodeIndex?: Array<{ index: number; name: string }>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeWorkflowNodeParameters(json: WorkflowJSON): void {
	for (const node of json.nodes ?? []) {
		if (!isRecord(node.parameters)) {
			node.parameters = {};
		}
	}
}

/**
 * Recover a WorkflowStructureIssue[] from a caught save error by duck typing.
 *
 * The CLI adapter throws `WorkflowStructureBadRequestError` (defined in
 * packages/cli/src/workflow-helpers.ts) which carries `issues: WorkflowStructureIssue[]`.
 * We can't import the class here without taking a dep on `cli`, so we recognise
 * the shape: `issues` is a non-empty array whose entries each have an array
 * `path` and a string `message`.
 */
export function extractStructureIssues(error: unknown): WorkflowStructureIssue[] | undefined {
	if (!error || typeof error !== 'object') return undefined;
	const candidate = (error as { issues?: unknown }).issues;
	if (!Array.isArray(candidate) || candidate.length === 0) return undefined;
	for (const issue of candidate) {
		if (!issue || typeof issue !== 'object') return undefined;
		const { path, message } = issue as { path?: unknown; message?: unknown };
		if (!Array.isArray(path) || typeof message !== 'string') return undefined;
	}
	return candidate as WorkflowStructureIssue[];
}

/**
 * Build the `nodeIndex` map (cheap — ~10-20 tokens per node) so the AI can
 * resolve a `nodes[N]` Zod path back to its source-code node by name without
 * counting entries in its own SDK-builder code.
 */
export function buildNodeIndex(json: WorkflowJSON): Array<{ index: number; name: string }> {
	return (json.nodes ?? []).map((node, index) => ({ index, name: node.name ?? '' }));
}

/**
 * Traverse `root` following the Zod issue `path`. Returns whatever lives at
 * the path, or `undefined` if any segment is missing / out of range.
 */
function valueAtPath(root: unknown, path: ReadonlyArray<string | number>): unknown {
	let cursor: unknown = root;
	for (const segment of path) {
		if (cursor === null || cursor === undefined) return undefined;
		if (typeof segment === 'number') {
			if (!Array.isArray(cursor)) return undefined;
			cursor = cursor[segment];
		} else {
			if (typeof cursor !== 'object') return undefined;
			cursor = (cursor as Record<string, unknown>)[segment];
		}
	}
	return cursor;
}

/**
 * Format a Zod issue path (mixed string|number segments) as the same bracketed
 * string the server's error message uses — e.g. `nodes[9].parameters`. Mirrors
 * `formatWorkflowStructureIssuePath` in `n8n-workflow` but kept inline so we
 * don't take a runtime dep on it from the tool layer.
 */
function formatIssuePath(path: ReadonlyArray<string | number>): string {
	if (path.length === 0) return 'workflow';
	return path.reduce<string>((acc, segment) => {
		if (typeof segment === 'number') return `${acc}[${segment}]`;
		return acc ? `${acc}.${segment}` : segment;
	}, '');
}

/**
 * Build the per-issue diagnostic array surfaced as `errorDetails` on save
 * failure. For each issue, attach the smallest sufficient slice of `json`:
 *   - `nodes[N].*` paths → full `nodeJson` so the AI sees the offending node
 *   - `connections.<sourceName>.*` paths → the source's `connectionSlice`
 *   - everything else → no slice; `offendingValue` and `path` carry the signal
 */
export function buildErrorDetails(
	issues: WorkflowStructureIssue[],
	json: WorkflowJSON,
): SubmitWorkflowErrorDetail[] {
	return issues.map((issue) => {
		const path = issue.path;
		const detail: SubmitWorkflowErrorDetail = {
			path: formatIssuePath(path),
			code: issue.code,
			message: issue.message,
			offendingValue: valueAtPath(json, path),
		};

		const [head, second] = path;
		if (head === 'nodes' && typeof second === 'number') {
			detail.nodeJson = json.nodes?.[second];
		} else if (head === 'connections' && typeof second === 'string') {
			detail.connectionSlice = json.connections?.[second];
		}

		return detail;
	});
}

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
		.describe('Path to the TypeScript workflow file (defaults to the builder task main file)'),
	workflowId: z
		.string()
		.optional()
		.describe(
			'Existing n8n workflow id to update (a 16-character nanoid returned by a previous submit-workflow call or workflows tool). OMIT this argument when creating a new workflow. Do NOT pass the local id from workflow(id, name) in your SDK code — that string is a local handle, not an n8n workflow id.',
		),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to create the workflow in. Defaults to personal project.'),
	name: z.string().optional().describe('Workflow name (required for new workflows)'),
});

/**
 * Per-issue diagnostic returned alongside `errors[]` when a save fails with a
 * structured workflow-structure validation error. Carries the smallest sufficient
 * slice of the submitted JSON so the AI can map a Zod path back to its source code
 * without counting nodes manually:
 *   - `path` / `code` / `message` come from the server's Zod issue
 *   - `offendingValue` is the value found at `path` inside the submitted JSON
 *   - `nodeJson` is populated when the path is `nodes[N].*` — the full node object
 *   - `connectionSlice` is populated when the path is `connections.<sourceName>.*`
 */
export const submitWorkflowErrorDetailSchema = z.object({
	path: z.string(),
	code: z.string(),
	message: z.string(),
	offendingValue: z.unknown().optional(),
	nodeJson: z.unknown().optional(),
	connectionSlice: z.unknown().optional(),
});

export const submitWorkflowOutputSchema = z.object({
	success: z.boolean(),
	workflowId: z.string().optional(),
	workflowName: z.string().optional(),
	/** Node names whose credentials were mocked via pinned data. */
	mockedNodeNames: z.array(z.string()).optional(),
	/** Credential types that were mocked (not resolved to real credentials). */
	mockedCredentialTypes: z.array(z.string()).optional(),
	/** Map of node name → credential types that were mocked on that node. */
	mockedCredentialsByNode: z.record(z.array(z.string())).optional(),
	/** Verification-only pin data — scoped to this build, never persisted to workflow. */
	verificationPinData: z.record(z.array(z.record(z.unknown()))).optional(),
	/** True when mocked credentials can be verified with saved workflow-level pin data. */
	usesWorkflowPinDataForVerification: z.boolean().optional(),
	/** Sub-workflow IDs referenced by the submitted main workflow. */
	referencedWorkflowIds: z.array(z.string()).optional(),
	remediation: z
		.object({
			category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
			shouldEdit: z.boolean(),
			guidance: z.string(),
			reason: z.string().optional(),
			remainingSubmitFixes: z.number().int().min(0).optional(),
			attemptCount: z.number().int().min(0).optional(),
		})
		.optional(),
	errors: z.array(z.string()).optional(),
	/**
	 * Structured per-issue diagnostics emitted on save failure. One entry per Zod
	 * issue, ordered to match `errors[]`.
	 */
	errorDetails: z.array(submitWorkflowErrorDetailSchema).optional(),
	/**
	 * Index-to-name map for the submitted workflow's nodes. Always emitted when
	 * `json` reached the save step. Lets the AI translate `nodes[N]` paths in
	 * error messages back to the named node in its source code in one step.
	 */
	nodeIndex: z.array(z.object({ index: z.number().int().min(0), name: z.string() })).optional(),
	warnings: z.array(z.string()).optional(),
});

export type SubmitWorkflowInput = z.infer<typeof submitWorkflowInputSchema>;
export type SubmitWorkflowOutput = z.infer<typeof submitWorkflowOutputSchema>;
export type SubmitWorkflowErrorDetail = z.infer<typeof submitWorkflowErrorDetailSchema>;

export interface SubmitWorkflowToolOptions {
	root?: string;
	defaultFilePath?: string;
}

/**
 * Resolve a raw `filePath` tool argument into an absolute path under the sandbox root.
 * Exported so identity wrappers can key state by the same resolved path the tool uses.
 */
export function resolveSandboxWorkflowFilePath(
	rawFilePath: string | undefined,
	root: string,
): string {
	if (!rawFilePath) {
		return `${root}/src/workflow.ts`;
	}
	if (rawFilePath.startsWith('~/')) {
		return `${root.replace(/\/workspace$/, '')}/${rawFilePath.slice(2)}`;
	}
	if (!rawFilePath.startsWith('/')) {
		return `${root}/${rawFilePath}`;
	}
	return rawFilePath;
}

export function classifySubmitFailure(
	errors: string[],
	reason = 'submit_failed',
): RemediationMetadata {
	const text = errors.join('\n').toLowerCase();
	if (isCredentialSaveFailure(text)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason,
			guidance:
				'Workflow submission failed because a credential is missing or inaccessible. Stop editing and route the user to credential setup.',
		});
	}

	if (reason === 'workflow_save_failed') {
		if (text.includes('workflow structure is invalid') || text.includes('invalid_type')) {
			return createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason,
				guidance: 'Fix the workflow code in one batched edit, then call submit-workflow again.',
			});
		}

		if (text.includes('workflow not found')) {
			return createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason,
				guidance:
					'The workflowId passed to submit-workflow does not exist. Omit the workflowId argument to create a new workflow, or pass an existing workflow id. Do not reuse the local id from workflow(id, name) in your SDK code — that is a local handle, not an n8n workflow id.',
			});
		}

		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason,
			guidance:
				'Workflow submission failed due to an internal or service error. Stop editing and ask the user to retry or check instance health.',
		});
	}

	if (
		text.includes('blocked by admin') ||
		text.includes('read-only') ||
		text.includes('not accessible') ||
		text.includes('permission')
	) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason,
			guidance:
				'Workflow submission is blocked by permissions or instance configuration. Stop editing and explain the blocker to the user.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason,
		guidance: 'Fix the workflow code in one batched edit, then call submit-workflow again.',
	});
}

function isCredentialSaveFailure(text: string): boolean {
	if (!text.includes('credential')) return false;

	return (
		text.includes('not found') ||
		text.includes('missing') ||
		text.includes('not accessible') ||
		text.includes('no access') ||
		text.includes('do not have access') ||
		text.includes("don't have access") ||
		text.includes('not shared') ||
		text.includes('unauthorized')
	);
}

export function createSubmitWorkflowTool(
	context: InstanceAiContext,
	workspace: SandboxWorkspace,
	credentialMap: CredentialMap = new Map(),
	onAttempt?: (attempt: SubmitWorkflowAttempt) => void | Promise<void>,
	options: SubmitWorkflowToolOptions = {},
) {
	return new Tool('submit-workflow')
		.description(
			'Submit a workflow from a TypeScript file in the sandbox. Reads the file, validates it, ' +
				'and saves it to n8n as a draft. Publishing policy lives in the builder prompt ' +
				'(main workflows wait for the user; sub-workflow chunks may be auto-published).',
		)
		.input(submitWorkflowInputSchema)
		.output(submitWorkflowOutputSchema)
		.handler(
			async ({ filePath: rawFilePath, workflowId, projectId, name }: SubmitWorkflowInput) => {
				const root = options.root ?? (await getWorkspaceRoot(workspace));
				const filePath =
					rawFilePath || !options.defaultFilePath
						? resolveSandboxWorkflowFilePath(rawFilePath, root)
						: options.defaultFilePath;

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

				const permKey = workflowId ? 'updateWorkflow' : 'createWorkflow';
				if (context.permissions?.[permKey] === 'blocked') {
					const errors = ['Action blocked by admin'];
					const remediation = classifySubmitFailure(errors, 'permission_blocked');
					await reportAttempt({ success: false, errors, remediation });
					return { success: false, errors, remediation };
				}

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
					const remediation = classifySubmitFailure(errors, 'sandbox_execution_failed');
					await reportAttempt({ success: false, errors, remediation });
					return {
						success: false,
						errors,
						remediation,
					};
				}

				if (!buildOutput.success || !buildOutput.workflow) {
					const errors = enhanceBuildErrors(buildOutput.errors ?? ['Unknown build error']);
					const remediation = classifySubmitFailure(errors, 'build_failed');
					await reportAttempt({ success: false, errors, remediation });
					return {
						success: false,
						errors,
						remediation,
					};
				}

				// Collect structural warnings from sandbox (graph validation)
				const allWarnings: ValidationWarning[] = (buildOutput.warnings ?? []).map((w) => ({
					code: w.code,
					message: w.message,
					nodeName: w.nodeName,
				}));

				const json = buildOutput.workflow;
				normalizeWorkflowNodeParameters(json);

				// Server-side schema validation (Zod checks against node type definitions).
				// strictMode is hardcoded on at AI-builder call sites — we want every
				// catchable bug surfaced as a blocking error so the agent can self-correct.
				const schemaValidation = validateWorkflow(json, {
					nodeTypesProvider: context.nodeTypesProvider,
					strictMode: true,
				});
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
					const remediation = classifySubmitFailure(formattedErrors, 'validation_failed');
					await reportAttempt({ success: false, errors: formattedErrors, remediation });
					return {
						success: false,
						errors: formattedErrors,
						remediation,
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				}

				// Keep positions from the generated workflow. Re-layout here would move
				// existing nodes during workflow updates and make small edits hard to review.
				if (name) {
					json.name = name;
				} else if (!json.name && !workflowId) {
					const errors = [
						'Workflow name is required for new workflows. Provide a name parameter or set it in the SDK code.',
					];
					const remediation = classifySubmitFailure(errors, 'missing_workflow_name');
					await reportAttempt({ success: false, errors, remediation });
					return {
						success: false,
						errors,
						remediation,
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
				try {
					if (workflowId) {
						const updated = await context.workflowService.updateFromWorkflowJSON(
							workflowId,
							json,
							projectId ? { projectId } : undefined,
						);
						savedId = updated.id;
					} else {
						const created = await context.workflowService.createFromWorkflowJSON(json, {
							...(projectId ? { projectId } : {}),
							markAsAiTemporary: true,
						});
						savedId = created.id;
						(context.aiCreatedWorkflowIds ??= new Set<string>()).add(created.id);
					}
				} catch (error) {
					const errors = [
						`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					];
					const remediation = classifySubmitFailure(errors, 'workflow_save_failed');
					const issues = extractStructureIssues(error);
					const errorDetails = issues ? buildErrorDetails(issues, json) : undefined;
					const nodeIndex = buildNodeIndex(json);
					await reportAttempt({
						success: false,
						errors,
						remediation,
						errorDetails,
						nodeIndex,
					});
					return {
						success: false,
						errors,
						remediation,
						errorDetails,
						nodeIndex,
					};
				}

				const hasMockedCredentials = mockResult.mockedNodeNames.length > 0;
				const referencedWorkflowIds = getReferencedWorkflowIds(json);

				// Add mock summary warning when credentials were mocked
				if (hasMockedCredentials) {
					informational.push({
						code: 'CREDENTIALS_MOCKED',
						message: `Mocked ${mockResult.mockedCredentialTypes.join(', ')} via pinned data on nodes: ${mockResult.mockedNodeNames.join(', ')}. Add real credentials before publishing.`,
					});
				}

				const triggerNodes = (json.nodes ?? [])
					.filter((n) => isTriggerNodeType(n.type))
					.map((n) => ({ nodeName: n.name, nodeType: n.type }))
					.filter(
						(t): t is { nodeName: string; nodeType: string } =>
							Boolean(t.nodeName) && Boolean(t.nodeType),
					);

				// Scan node parameters for unresolved placeholder values
				const hasPlaceholders = (json.nodes ?? []).some((n) => hasPlaceholderDeep(n.parameters));

				await reportAttempt({
					success: true,
					workflowId: savedId,
					triggerNodes,
					mockedNodeNames: hasMockedCredentials ? mockResult.mockedNodeNames : undefined,
					mockedCredentialTypes: hasMockedCredentials
						? mockResult.mockedCredentialTypes
						: undefined,
					mockedCredentialsByNode: hasMockedCredentials
						? mockResult.mockedCredentialsByNode
						: undefined,
					verificationPinData:
						hasMockedCredentials && Object.keys(mockResult.verificationPinData).length > 0
							? mockResult.verificationPinData
							: undefined,
					usesWorkflowPinDataForVerification:
						mockResult.usesWorkflowPinDataForVerification || undefined,
					referencedWorkflowIds:
						referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
					hasUnresolvedPlaceholders: hasPlaceholders || undefined,
				});
				return {
					success: true,
					workflowId: savedId,
					workflowName: json.name || undefined,
					mockedNodeNames: hasMockedCredentials ? mockResult.mockedNodeNames : undefined,
					mockedCredentialTypes: hasMockedCredentials
						? mockResult.mockedCredentialTypes
						: undefined,
					mockedCredentialsByNode: hasMockedCredentials
						? mockResult.mockedCredentialsByNode
						: undefined,
					verificationPinData:
						hasMockedCredentials && Object.keys(mockResult.verificationPinData).length > 0
							? mockResult.verificationPinData
							: undefined,
					usesWorkflowPinDataForVerification:
						mockResult.usesWorkflowPinDataForVerification || undefined,
					referencedWorkflowIds:
						referencedWorkflowIds.length > 0 ? referencedWorkflowIds : undefined,
					warnings:
						informational.length > 0
							? informational.map((w) => `[${w.code}]: ${w.message}`)
							: undefined,
				};
			},
		)
		.build();
}
