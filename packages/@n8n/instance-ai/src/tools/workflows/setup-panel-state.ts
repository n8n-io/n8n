/**
 * Setup panel v2: the agent's view of a workflow's setup state.
 *
 * Read saved workflows to learn what changed between turns. Keep a memo of
 * open items to identify changes at the next observation. Observation does
 * not publish snapshots or select a build target.
 */
import type { InstanceAiSetupItem } from '@n8n/api-types';

import {
	buildSetupItemsFromSetupRequests,
	credentialSetupItemId,
	isSetupPanelEnabled,
	parametersSetupItemId,
} from './setup-items';
import type { SetupRequest } from './setup-workflow.schema';
import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

const METADATA_KEY = 'instanceAiSetupPanelOpenItems';
/** Workflows kept in the memo; older entries fall off. */
const MAX_REMEMBERED_WORKFLOWS = 10;
/** Bound the saved-state reads before the agent starts answering. */
const MAX_OBSERVED_WORKFLOWS = 3;

/** Compact, LLM-facing description of one checklist item. */
export type SetupItemDescription =
	| { kind: 'credential'; credentialType: string; nodes?: string[] }
	| { kind: 'parameters'; nodeName: string; parameterNames?: string[] };

export interface WorkflowSetupStateSummary {
	workflowId: string;
	/** The full checklist derived from the current analysis. */
	items: InstanceAiSetupItem[];
	/** Items the user still has to act on. */
	open: InstanceAiSetupItem[];
	/** Items already satisfied: slots bound to a stored credential. */
	configured: InstanceAiSetupItem[];
	/** Items open at the agent's previous look that are no longer open. */
	settledSinceLastLook: SetupItemDescription[];
	/** A stored binding does not guarantee that its connection test passed. */
	validationWarnings: Array<{ nodeName: string; credentialType?: string; message?: string }>;
}

/** Ids of the items the requests report as still needing the user. */
export function openSetupItemIds(
	workflowId: string,
	requests: readonly SetupRequest[],
): Set<string> {
	const ids = new Set<string>();
	for (const request of requests) {
		if (request.credentialType !== undefined && request.credentialNeedsAction === true) {
			ids.add(credentialSetupItemId(workflowId, request.credentialType, request.node.name));
		}
		if (Object.keys(request.parameterIssues ?? {}).length > 0) {
			ids.add(parametersSetupItemId(workflowId, request.node.name));
		}
	}
	return ids;
}

export function describeSetupItem(item: InstanceAiSetupItem): SetupItemDescription {
	if (item.kind === 'credential') {
		const nodes = item.nodeBindings?.map((binding) => binding.nodeName) ?? [];
		return {
			kind: 'credential',
			credentialType: item.credentialType,
			...(nodes.length > 0 ? { nodes } : {}),
		};
	}
	return { kind: 'parameters', nodeName: item.nodeName, parameterNames: item.parameterNames };
}

/**
 * Recover a description from an id alone, for an item that left the snapshot
 * (a parameter issue resolved, a node removed). Mirrors `credentialSetupItemId`
 * and `parametersSetupItemId`.
 */
function describeSetupItemId(workflowId: string, id: string): SetupItemDescription | undefined {
	const credentialPrefix = `${workflowId}:credential:`;
	if (id.startsWith(credentialPrefix)) {
		const key = id.slice(credentialPrefix.length);
		const separator = key.indexOf(':');
		const credentialType = separator === -1 ? key : key.slice(0, separator);
		const nodeName = separator === -1 ? undefined : key.slice(separator + 1);
		if (!credentialType) return undefined;
		return { kind: 'credential', credentialType, ...(nodeName ? { nodes: [nodeName] } : {}) };
	}
	const parametersPrefix = `${workflowId}:parameters:`;
	if (id.startsWith(parametersPrefix)) {
		const nodeName = id.slice(parametersPrefix.length);
		return nodeName ? { kind: 'parameters', nodeName } : undefined;
	}
	return undefined;
}

/** Pure: snapshot plus open/configured split, diffed against the previous look. */
export function summarizeWorkflowSetupState(
	workflowId: string,
	requests: readonly SetupRequest[],
	previouslyOpenIds: ReadonlySet<string> = new Set(),
): WorkflowSetupStateSummary {
	const items = buildSetupItemsFromSetupRequests(workflowId, requests);
	const openIds = openSetupItemIds(workflowId, requests);
	const open = items.filter((item) => openIds.has(item.id));
	const configured = items.filter((item) => !openIds.has(item.id));
	const byId = new Map(items.map((item) => [item.id, item]));
	const settledSinceLastLook = [...previouslyOpenIds]
		.filter((id) => !openIds.has(id))
		.map((id) => {
			const item = byId.get(id);
			return item ? describeSetupItem(item) : describeSetupItemId(workflowId, id);
		})
		.filter((description): description is SetupItemDescription => description !== undefined);
	const validationWarnings = requests.flatMap((request) =>
		request.credentialTestResult?.success === false
			? [
					{
						nodeName: request.node.name,
						credentialType: request.credentialType,
						message: request.credentialTestResult.message,
					},
				]
			: [],
	);
	return { workflowId, items, open, configured, settledSinceLastLook, validationWarnings };
}

type OpenItemsMemo = Record<string, string[]>;

function parseMemo(value: unknown): OpenItemsMemo {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
	const memo: OpenItemsMemo = {};
	for (const [workflowId, ids] of Object.entries(value)) {
		if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) memo[workflowId] = ids;
	}
	return memo;
}

async function readOpenItemsMemo(context: InstanceAiContext): Promise<OpenItemsMemo> {
	if (!context.threadMemory || !context.threadId) return {};
	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return parseMemo(thread?.metadata?.[METADATA_KEY]);
	} catch (error) {
		context.logger?.warn('Failed to read the setup panel memo from thread metadata', {
			error: error instanceof Error ? error.message : String(error),
		});
		return {};
	}
}

async function rememberOpenItems(
	context: InstanceAiContext,
	workflowId: string,
	openIds: readonly string[],
): Promise<void> {
	if (!context.threadMemory || !context.threadId) return;
	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => {
				const memo = parseMemo(metadata[METADATA_KEY]);
				// Re-insert so the most recently seen workflow is last and survives the cap.
				delete memo[workflowId];
				memo[workflowId] = [...openIds];
				const entries = Object.entries(memo).slice(-MAX_REMEMBERED_WORKFLOWS);
				return { metadata: { ...metadata, [METADATA_KEY]: Object.fromEntries(entries) } };
			},
		});
	} catch (error) {
		context.logger?.warn('Failed to persist the setup panel memo to thread metadata', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/** Do not turn a temporary request for replacement into a completion fact. */
export async function rememberWorkflowSetupState(
	context: InstanceAiContext,
	workflowId: string,
	requests: readonly SetupRequest[],
): Promise<void> {
	const savedRequests = requests.map((request) =>
		request.preferNewCredential ? { ...request, credentialNeedsAction: false } : request,
	);
	await rememberOpenItems(context, workflowId, [...openSetupItemIds(workflowId, savedRequests)]);
}

/**
 * One "look" at a workflow the caller already analyzed with `includeSettled`:
 * announce the snapshot, diff against the previous look, remember this one.
 * A build must not fail because its early checklist could not be published.
 * The final setup handoff confirms persistence separately.
 */
export async function recordWorkflowSetupState(
	context: InstanceAiContext,
	workflowId: string,
	requests: readonly SetupRequest[],
): Promise<WorkflowSetupStateSummary> {
	const memo = await readOpenItemsMemo(context);
	const summary = summarizeWorkflowSetupState(
		workflowId,
		requests,
		new Set(memo[workflowId] ?? []),
	);
	if (isSetupPanelEnabled(context)) {
		try {
			context.setupItemsEmitter.emit(workflowId, summary.items);
		} catch (error) {
			context.logger?.warn('Failed to emit setup-items snapshot for built workflow', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	await rememberWorkflowSetupState(context, workflowId, requests);
	return summary;
}

/**
 * Ground truth at run start: re-analyze the workflows this thread announced and
 * record a look at each. A workflow that no longer analyzes (deleted, no access)
 * is skipped. Most recently announced first, capped to bound the cost.
 */
export async function observeWorkflowSetupStates(
	context: InstanceAiContext,
	workflowIds: readonly string[],
): Promise<WorkflowSetupStateSummary[]> {
	const { analyzeWorkflow } = await import('./setup-workflow.service.js');
	const memo = await readOpenItemsMemo(context);
	const summaries: WorkflowSetupStateSummary[] = [];
	for (const workflowId of workflowIds.slice(0, MAX_OBSERVED_WORKFLOWS)) {
		try {
			const requests = await analyzeWorkflow(context, workflowId, undefined, {
				includeSettled: true,
				validationMode: 'configuration',
			});
			summaries.push(
				summarizeWorkflowSetupState(workflowId, requests, new Set(memo[workflowId] ?? [])),
			);
			await rememberWorkflowSetupState(context, workflowId, requests);
		} catch (error) {
			context.logger?.debug?.('Skipping setup state for a workflow that did not analyze', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return summaries;
}

/**
 * The per-turn note the host wraps in `<workflow-setup-state>`. Empty when
 * there is nothing to say (no announced workflow analyzed).
 */
export function formatWorkflowSetupStateNote(
	summaries: readonly WorkflowSetupStateSummary[],
): string {
	if (summaries.length === 0) return '';
	const workflows = summaries.map((summary) => ({
		workflowId: summary.workflowId,
		open: summary.open.map(describeSetupItem),
		configured: summary.configured.map(describeSetupItem),
		settledSinceLastTurn: summary.settledSinceLastLook,
		...(summary.validationWarnings.length > 0
			? { validationWarnings: summary.validationWarnings }
			: {}),
	}));
	return [
		'Setup state of the workflows this conversation built, recomputed just now from the saved ' +
			'workflows and the credentials in this project. The setup panel next to the chat shows the ' +
			'current checklist and the user completes items there. This observation does not test connections ' +
			'or resource availability. A configured item is not proof of a successful connection test or ' +
			'workflow execution. Never ask ' +
			'for secrets in chat. `settledSinceLastTurn` names items that were open at your previous ' +
			'look and are not anymore (configured, or removed from the workflow). Trust this over older ' +
			'tool results.',
		JSON.stringify({ workflows }),
	].join('\n');
}
