/**
 * Validate workflow service — computes the same per-node issues that the editor
 * canvas surfaces as red warning indicators (missing credentials, parameter
 * issues, missing required input connections, etc.). Mirrors `getNodeIssues` in
 * `packages/frontend/editor-ui/src/app/composables/useNodeHelpers.ts`.
 *
 * Phases shipped:
 *   1. Parameter issues + credential issues (notSet, notIdentified, doNotExist,
 *      HTTP genericCredentialType / proxy-auth paths, AI-gateway-managed bypass).
 *   2. Required-input-connection issues (AI Agent missing language model, Merge
 *      missing a branch, etc.).
 *   3. Execution issues — `execution: true` on nodes whose most recent run had
 *      an error. Requires workflowId; inline-workflow mode skips silently.
 *
 * Still deferred:
 *   4. Niche edge cases (usedCredentialIds polish, pinData skip, inline JSON).
 */
import type { DisplayOptions, NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { matchesDisplayOptions } from '@n8n/workflow-sdk';
import type {
	IConnections,
	INodeInputConfiguration,
	INodeIssueObjectProperty,
	INodeIssues,
	ITaskData,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeHelpers, getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';

import type { InstanceAiContext, NodeDescription } from '../../types';

// ── Output shape ────────────────────────────────────────────────────────────

export interface ValidateWorkflowResult {
	workflowId?: string;
	/** Per-node `INodeIssues`. Nodes without issues are omitted. */
	issues: Record<string, INodeIssues>;
	/** Human-readable lines, one per issue, suitable for inline display in chat output. */
	summary: string[];
	/** True when no issues were found across all nodes. */
	valid: boolean;
}

export interface ValidateWorkflowInput {
	workflowId?: string;
	workflow?: WorkflowJSON;
	ignoreIssues?: string[];
}

// ── Per-credential-type lookup cache ────────────────────────────────────────

interface CredentialLookupCache {
	byType: Map<string, Promise<Array<{ id: string; name: string }>>>;
}

function createLookupCache(): CredentialLookupCache {
	return { byType: new Map() };
}

async function listCredentialsByType(
	context: InstanceAiContext,
	cache: CredentialLookupCache,
	credentialType: string,
): Promise<Array<{ id: string; name: string }>> {
	let promise = cache.byType.get(credentialType);
	if (!promise) {
		// Unscoped lookup — mirror the editor's `credentialsStore.getCredentialsByType`,
		// which checks against every credential the user can access regardless of
		// workflow scope.
		promise = context.credentialService
			.list({ type: credentialType })
			.then((creds) => creds.map((c) => ({ id: c.id, name: c.name })))
			.catch(() => [] as Array<{ id: string; name: string }>);
		cache.byType.set(credentialType, promise);
	}
	return await promise;
}

// ── Frontend-mirrored credential checks ─────────────────────────────────────

/** Mirrors `selectedCredsAreUnusable` in useNodeHelpers.ts. */
function selectedCredsAreUnusable(node: NodeJSON, credentialType: string): boolean {
	return !node.credentials || !Object.keys(node.credentials).includes(credentialType);
}

/** Mirrors `selectedCredsDoNotExist` in useNodeHelpers.ts. */
function selectedCredsDoNotExist(
	node: NodeJSON,
	credentialType: string,
	stored: Array<{ id: string; name: string }>,
): boolean {
	const selected = node.credentials?.[credentialType];
	if (!selected?.id) return false;
	return !stored.some((s) => s.id === selected.id);
}

/** True when the node uses the HTTP-request proxy-auth pattern. Mirrors
 *  `hasProxyAuth` in editor-ui/utils/nodeTypesUtils.ts. */
function hasProxyAuth(node: NodeJSON): boolean {
	const params = (node.parameters ?? {}) as Record<string, unknown>;
	return Object.keys(params).includes('nodeCredentialType');
}

function notSetIssue(
	credentialType: string,
	nodeTypeDisplayName: string,
): INodeIssueObjectProperty {
	return {
		[credentialType]: [`Credentials for ${nodeTypeDisplayName} are not set.`],
	};
}

function notIdentifiedIssue(
	credentialType: string,
	credentialName: string,
	credentialTypeDisplayName: string,
): INodeIssueObjectProperty {
	return {
		[credentialType]: [
			`Credentials with name ${credentialName} exist for ${credentialTypeDisplayName}.`,
			'Credentials are not clearly identified. Please select the correct credentials.',
		],
	};
}

function doNotExistIssue(
	credentialType: string,
	credentialName: string,
	credentialTypeDisplayName: string,
): INodeIssueObjectProperty {
	return {
		[credentialType]: [
			`Credentials with name ${credentialName} do not exist for ${credentialTypeDisplayName}.`,
			'You can create credentials with the exact name and then they get auto-selected on refresh..',
		],
	};
}

/**
 * Compute credential issues for a node. Mirrors `getNodeCredentialIssues` in
 * useNodeHelpers.ts (lines 416-572).
 *
 * `usedCredentialIds` represents the set of credential IDs the workflow
 * already references — the editor uses this to suppress the "doesn't exist"
 * issue in shared-workflow proxy-auth scenarios. Empty Set in Phase 1.
 */
async function computeCredentialIssues(
	context: InstanceAiContext,
	cache: CredentialLookupCache,
	node: NodeJSON,
	nodeDesc: NodeDescription,
	usedCredentialIds: Set<string>,
): Promise<INodeIssues | null> {
	if (node.disabled) return null;
	if (!nodeDesc.credentials || nodeDesc.credentials.length === 0) return null;

	const parameters = (node.parameters ?? {}) as Record<string, unknown>;
	const typeVersion = node.typeVersion ?? 1;
	const authentication = parameters.authentication;
	const genericAuthType = parameters.genericAuthType;
	const nodeCredentialType = parameters.nodeCredentialType;

	// HTTP Request v2 generic-auth path: credential type is in `parameters.genericAuthType`.
	if (
		authentication === 'genericCredentialType' &&
		typeof genericAuthType === 'string' &&
		genericAuthType !== '' &&
		selectedCredsAreUnusable(node, genericAuthType)
	) {
		return { credentials: notSetIssue(genericAuthType, nodeDesc.displayName) };
	}

	// HTTP Request v2 proxy-auth predefined-credential paths.
	if (
		hasProxyAuth(node) &&
		authentication === 'predefinedCredentialType' &&
		typeof nodeCredentialType === 'string' &&
		nodeCredentialType !== '' &&
		node.credentials !== undefined
	) {
		const stored = await listCredentialsByType(context, cache, nodeCredentialType);
		const selectedId = node.credentials[nodeCredentialType]?.id;
		const isCredentialUsedInWorkflow =
			typeof selectedId === 'string' && usedCredentialIds.has(selectedId);

		if (selectedCredsDoNotExist(node, nodeCredentialType, stored) && !isCredentialUsedInWorkflow) {
			return { credentials: notSetIssue(nodeCredentialType, nodeDesc.displayName) };
		}
	}

	if (
		hasProxyAuth(node) &&
		authentication === 'predefinedCredentialType' &&
		typeof nodeCredentialType === 'string' &&
		nodeCredentialType !== '' &&
		selectedCredsAreUnusable(node, nodeCredentialType)
	) {
		return { credentials: notSetIssue(nodeCredentialType, nodeDesc.displayName) };
	}

	const foundIssues: INodeIssueObjectProperty = {};

	for (const credentialTypeDescription of nodeDesc.credentials) {
		if (credentialTypeDescription.displayOptions) {
			const visible = matchesDisplayOptions(
				{ parameters, nodeVersion: typeVersion },
				credentialTypeDescription.displayOptions as DisplayOptions,
			);
			if (!visible) continue;
		}

		const credName = credentialTypeDescription.name;
		// Without a credential type display name registry on the backend, fall
		// back to the type name itself — same fallback the frontend uses when
		// `getCredentialTypeByName` returns undefined.
		const credentialTypeDisplayName = credName;

		const selected = node.credentials?.[credName];

		if (!selected) {
			if (credentialTypeDescription.required) {
				Object.assign(foundIssues, notSetIssue(credName, nodeDesc.displayName));
			}
			continue;
		}

		// AI-gateway-managed credentials have no real DB record — treat as configured.
		if (
			typeof selected === 'object' &&
			'__aiGatewayManaged' in selected &&
			(selected as { __aiGatewayManaged?: boolean }).__aiGatewayManaged === true
		) {
			continue;
		}

		const selectedRef =
			typeof selected === 'string'
				? { id: null, name: selected }
				: { id: selected.id ?? null, name: selected.name };

		const userCredentials = await listCredentialsByType(context, cache, credName);

		if (selectedRef.id) {
			const idMatch = userCredentials.find((c) => c.id === selectedRef.id);
			if (idMatch) continue;
		}

		const nameMatches = userCredentials.filter((c) => c.name === selectedRef.name);
		if (nameMatches.length > 1) {
			Object.assign(
				foundIssues,
				notIdentifiedIssue(credName, selectedRef.name, credentialTypeDisplayName),
			);
			continue;
		}

		if (nameMatches.length === 0) {
			// Frontend suppresses this when the credential ID is in `usedCredentials`
			// or when the user has global `credential:read` scope. Phase 1 ports the
			// usedCredentials half (passed in as a Set) and conservatively assumes
			// the user lacks the global scope — matches the most common case where
			// the agent is verifying a workflow owned by the user.
			const isUsedInWorkflow =
				typeof selectedRef.id === 'string' && usedCredentialIds.has(selectedRef.id);
			if (!isUsedInWorkflow) {
				Object.assign(
					foundIssues,
					doNotExistIssue(credName, selectedRef.name, credentialTypeDisplayName),
				);
			}
		}
	}

	if (Object.keys(foundIssues).length === 0) return null;
	return { credentials: foundIssues };
}

// ── Input-connection check ──────────────────────────────────────────────────

/**
 * Compute input-connection issues for a node. Mirrors `getNodeInputIssues` in
 * useNodeHelpers.ts (lines 378-414).
 *
 * Required inputs (non-string `INodeInputConfiguration` with `required: true`)
 * must have at least one parent connection of the matching type. AI Agent
 * sub-node attachments (`ai_languageModel`, `ai_memory`, etc.) and Merge node
 * branches are the most common cases.
 *
 * `connectionsByDestination` is computed once in the entry function and reused
 * across nodes — `mapConnectionsByDestination` is O(n) per call so deduping
 * matters for big workflows.
 */
async function computeInputIssues(
	context: InstanceAiContext,
	workflowJson: WorkflowJSON,
	connectionsByDestination: IConnections,
	nodeName: string,
): Promise<INodeIssues | null> {
	if (!context.nodeService.getResolvedNodeInputs) return null;

	const inputs = await context.nodeService
		.getResolvedNodeInputs(workflowJson, nodeName)
		.catch(() => [] as Array<NodeConnectionType | INodeInputConfiguration>);

	const foundIssues: INodeIssueObjectProperty = {};

	for (const input of inputs) {
		// Plain-string inputs (`'main'`, `'ai_tool'`, ...) carry no `required` flag.
		if (typeof input === 'string') continue;
		if (input.required !== true) continue;

		const parents = getParentNodes(connectionsByDestination, nodeName, input.type, 1);
		if (parents.length === 0) {
			foundIssues[input.type] = [
				`No node connected to required input "${input.displayName ?? input.type}"`,
			];
		}
	}

	if (Object.keys(foundIssues).length === 0) return null;
	return { input: foundIssues };
}

// ── Execution check ─────────────────────────────────────────────────────────

/**
 * Returns the first error message in a node's most recent task data, or `null`
 * if none had an error. Mirrors `hasNodeExecutionIssues` (useNodeHelpers.ts:242)
 * but additionally surfaces the error text so the summary can include it — the
 * `INodeIssues.execution` boolean stays in canvas-parity.
 */
function getFirstExecutionError(taskData: ITaskData[] | undefined): string | null {
	if (!taskData) return null;
	for (const task of taskData) {
		if (task.error !== undefined) {
			return task.error.message ?? 'Unknown error';
		}
	}
	return null;
}

// ── Per-node orchestration ──────────────────────────────────────────────────

async function computeNodeIssues(
	context: InstanceAiContext,
	cache: CredentialLookupCache,
	workflowJson: WorkflowJSON,
	connectionsByDestination: IConnections,
	node: NodeJSON,
	usedCredentialIds: Set<string>,
	latestRunData: Record<string, ITaskData[]> | null,
	executionErrors: Record<string, string>,
	ignoreIssues: ReadonlySet<string>,
): Promise<INodeIssues | null> {
	if (node.disabled) return null;
	if (!node.name) return null;

	const typeVersion = node.typeVersion ?? 1;
	const parameters = (node.parameters ?? {}) as Record<string, unknown>;

	const nodeDesc = await context.nodeService
		.getDescription(node.type, typeVersion)
		.catch(() => undefined);

	if (!nodeDesc) {
		if (ignoreIssues.has('typeUnknown')) return null;
		return { typeUnknown: true };
	}

	let issues: INodeIssues | null = null;

	if (!ignoreIssues.has('parameters') && context.nodeService.getParameterIssues) {
		const parameterIssues = await context.nodeService
			.getParameterIssues(node.type, typeVersion, parameters)
			.catch(() => ({}) as Record<string, string[]>);
		if (Object.keys(parameterIssues).length > 0) {
			issues = { parameters: parameterIssues };
		}
	}

	if (!ignoreIssues.has('credentials')) {
		const credentialIssues = await computeCredentialIssues(
			context,
			cache,
			node,
			nodeDesc,
			usedCredentialIds,
		);
		if (credentialIssues) {
			if (issues === null) {
				issues = credentialIssues;
			} else {
				NodeHelpers.mergeIssues(issues, credentialIssues);
			}
		}
	}

	if (!ignoreIssues.has('input')) {
		const inputIssues = await computeInputIssues(
			context,
			workflowJson,
			connectionsByDestination,
			node.name,
		);
		// NodeHelpers.mergeIssues doesn't know about the `input` key (only
		// `parameters` + `credentials`), so set it directly. `computeInputIssues`
		// already aggregates every input issue for the node into a single object.
		if (inputIssues?.input) {
			issues = issues ?? {};
			issues.input = inputIssues.input;
		}
	}

	if (!ignoreIssues.has('execution') && latestRunData) {
		const errorMessage = getFirstExecutionError(latestRunData[node.name]);
		if (errorMessage !== null) {
			issues = issues ?? {};
			issues.execution = true;
			executionErrors[node.name] = errorMessage;
		}
	}

	return issues;
}

// ── Summary formatting ──────────────────────────────────────────────────────

function formatSummaryLines(
	nodeName: string,
	issues: INodeIssues,
	executionErrors: Record<string, string>,
	pushTo: string[],
): void {
	if (issues.typeUnknown) {
		pushTo.push(`${nodeName}: typeUnknown: Unknown node type`);
	}
	for (const category of ['parameters', 'credentials', 'input'] as const) {
		const slice = issues[category];
		if (!slice || typeof slice !== 'object') continue;
		for (const [key, messages] of Object.entries(slice)) {
			if (!Array.isArray(messages)) continue;
			for (const message of messages) {
				if (typeof message !== 'string') continue;
				pushTo.push(`${nodeName}: ${category}.${key}: ${message}`);
			}
		}
	}
	if (issues.execution === true) {
		// Canvas parity keeps the structured signal as a boolean; the summary
		// gets the actual error message so the LLM doesn't need a separate call
		// to figure out what went wrong.
		const detail = executionErrors[nodeName];
		pushTo.push(
			detail
				? `${nodeName}: execution: A previous execution of this node failed: ${detail}`
				: `${nodeName}: execution: A previous execution of this node failed`,
		);
	}
}

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Verify a workflow and return per-node issues mirroring the canvas red badges.
 * Accepts either a stored workflow (`workflowId`) or an inline `WorkflowJSON`.
 */
export async function validateWorkflowConfig(
	context: InstanceAiContext,
	input: ValidateWorkflowInput,
): Promise<ValidateWorkflowResult> {
	if (!input.workflowId && !input.workflow) {
		throw new Error('validateWorkflowConfig requires either workflowId or workflow');
	}
	if (input.workflowId && input.workflow) {
		throw new Error('validateWorkflowConfig accepts workflowId OR workflow, not both');
	}

	const workflowJson: WorkflowJSON =
		input.workflow ?? (await context.workflowService.getAsWorkflowJSON(input.workflowId!));

	const ignoreIssues = new Set(input.ignoreIssues ?? []);
	const cache = createLookupCache();

	// Phase 1: no usedCredentialIds plumbing — set is always empty. The
	// suppression branch in computeCredentialIssues still respects it, so when
	// Phase 4 adds `workflowService.getUsedCredentialIds`, we'll only need to
	// populate this Set here.
	const usedCredentialIds = new Set<string>();

	// Invert connections once — every per-node input-issue check needs the
	// destination-keyed view, and mapConnectionsByDestination is O(n).
	const connectionsByDestination = mapConnectionsByDestination(
		(workflowJson.connections ?? {}) as IConnections,
	);

	// Fetch the latest run data once for the workflow. Skip when we have no
	// workflowId (inline-JSON mode has no execution context) or when execution
	// issues are suppressed. Adapter may not expose the method on older
	// installs — degrades silently.
	let latestRunData: Record<string, ITaskData[]> | null = null;
	if (
		input.workflowId &&
		!ignoreIssues.has('execution') &&
		context.workflowService.getLatestRunData
	) {
		latestRunData = await context.workflowService
			.getLatestRunData(input.workflowId)
			.catch(() => null);
	}

	// Per-node execution error messages, populated by computeNodeIssues and
	// consumed by formatSummaryLines so the LLM-facing summary carries the actual
	// error text without changing the canvas-parity INodeIssues shape.
	const executionErrors: Record<string, string> = {};

	const issues: Record<string, INodeIssues> = {};
	const summary: string[] = [];

	const nodes = workflowJson.nodes ?? [];
	const perNode = await Promise.all(
		nodes.map(async (node) => {
			const nodeIssues = await computeNodeIssues(
				context,
				cache,
				workflowJson,
				connectionsByDestination,
				node,
				usedCredentialIds,
				latestRunData,
				executionErrors,
				ignoreIssues,
			);
			return { node, nodeIssues };
		}),
	);

	for (const { node, nodeIssues } of perNode) {
		if (!nodeIssues || !node.name) continue;
		issues[node.name] = nodeIssues;
		formatSummaryLines(node.name, nodeIssues, executionErrors, summary);
	}

	return {
		...(input.workflowId ? { workflowId: input.workflowId } : {}),
		issues,
		summary,
		valid: summary.length === 0,
	};
}
