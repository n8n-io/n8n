import {
	MANUAL_TRIGGER_NODE_TYPE,
	createRunExecutionData,
	isTrimmedNodeExecutionData,
} from 'n8n-workflow';
import type {
	ITaskData,
	ExecutionStatus,
	ExecutionSummary,
	IDataObject,
	INode,
	IPinData,
	IRunData,
	ExecutionError,
	INodeTypeBaseDescription,
	INodeExecutionData,
	IWorkflowDataProxyAdditionalKeys,
} from 'n8n-workflow';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';
import type {
	ExecutionFilterType,
	ExecutionPreviewNodeSchema,
	ExecutionPreviewOutputSchema,
	ExecutionPreviewSchemaField,
	ExecutionsQueryFilter,
	ExecutionSummaryWithScopes,
	IExecutionFlattedResponse,
	IExecutionResponse,
	SingleNodeExecutionSummaryExtras,
} from './executions.types';
import type { ExecutionCaller, ExecutionCallerKind } from '@n8n/api-types';
import { isEmpty } from '@/app/utils/typesUtils';
import {
	CORE_NODES_CATEGORY,
	ERROR_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_TRIGGER_NODE_TYPE,
} from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { i18n } from '@n8n/i18n';
import { h } from 'vue';
import NodeExecutionErrorMessage from '@/app/components/NodeExecutionErrorMessage.vue';
import { parse } from 'flatted';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function getDefaultExecutionFilters(): ExecutionFilterType {
	return {
		workflowId: 'all',
		status: 'all',
		startDate: '',
		endDate: '',
		tags: [],
		annotationTags: [],
		metadata: [],
		vote: 'all',
		workflowVersionId: 'all',
	};
}

export const executionFilterToQueryFilter = (
	filter: Partial<ExecutionFilterType>,
): ExecutionsQueryFilter => {
	const queryFilter: IDataObject = {};
	if (filter.workflowId !== 'all') {
		queryFilter.workflowId = filter.workflowId;
	}

	if (!isEmpty(filter.tags)) {
		queryFilter.tags = filter.tags;
	}

	if (!isEmpty(filter.annotationTags)) {
		queryFilter.annotationTags = filter.annotationTags;
	}

	if (filter.vote !== 'all') {
		queryFilter.vote = filter.vote;
	}

	if (filter.workflowVersionId !== 'all') {
		queryFilter.workflowVersionId = filter.workflowVersionId;
	}

	if (!isEmpty(filter.metadata)) {
		queryFilter.metadata = filter.metadata;
	}

	if (filter.startDate) {
		queryFilter.startedAfter = filter.startDate;
	}

	if (filter.endDate) {
		queryFilter.startedBefore = filter.endDate;
	}

	switch (filter.status as ExecutionStatus) {
		case 'waiting':
			queryFilter.status = ['waiting'];
			break;
		case 'error':
			queryFilter.status = ['crashed', 'error'];
			break;
		case 'success':
			queryFilter.status = ['success'];
			break;
		case 'running':
			queryFilter.status = ['running', 'new'];
			break;
		case 'canceled':
			queryFilter.status = ['canceled'];
			break;
		case 'new':
			queryFilter.status = ['new'];
			break;
	}

	return queryFilter;
};

let formPopupWindow = false;

export const openFormPopupWindow = (url: string) => {
	if (!formPopupWindow) {
		const height = 700;
		const width = window.innerHeight - 50;
		const left = (window.innerWidth - height) / 2;
		const top = 50;
		const features = `width=${height},height=${width},left=${left},top=${top},resizable=yes,scrollbars=yes`;
		const windowName = `form-waiting-since-${Date.now()}`;
		window.open(url, windowName, features);
		formPopupWindow = true;
	}
};

export const clearPopupWindowState = () => (formPopupWindow = false);

export async function displayForm({
	nodes,
	runData,
	pinData,
	destinationNode,
	triggerNode,
	directParentNodes,
	source,
	getTestUrl,
}: {
	nodes: INode[];
	runData: IRunData | undefined;
	pinData: IPinData;
	destinationNode: string | undefined;
	triggerNode: string | undefined;
	directParentNodes: string[];
	source: string | undefined;
	getTestUrl: (node: INode) => string;
}) {
	for (const node of nodes) {
		if (triggerNode !== undefined && triggerNode !== node.name) continue;

		const hasNodeRunAndIsNotFormTrigger =
			runData?.hasOwnProperty(node.name) && node.type !== FORM_TRIGGER_NODE_TYPE;

		if (hasNodeRunAndIsNotFormTrigger || pinData[node.name]) continue;

		if (![FORM_TRIGGER_NODE_TYPE].includes(node.type)) continue;

		if (destinationNode && destinationNode !== node.name && !directParentNodes.includes(node.name))
			continue;

		if (node.name === destinationNode || !node.disabled) {
			let testUrl = '';
			if (node.type === FORM_TRIGGER_NODE_TYPE) testUrl = getTestUrl(node);

			try {
				const res = await fetch(testUrl, { method: 'GET' });
				if (!res.ok) continue;
			} catch (error) {
				continue;
			}

			if (testUrl && source !== 'RunData.ManualChatMessage') {
				clearPopupWindowState();
				openFormPopupWindow(testUrl);
			}
		}
	}
}

export const waitingNodeTooltip = (
	node: INodeUi | null | undefined,
	workflow?: WorkflowObjectAccessors,
	metadata?: { resumeUrl?: string; resumeFormUrl?: string },
) => {
	if (!node) return '';
	try {
		const waitingNodeTooltipFromNodeType = useNodeTypesStore().getNodeType(
			node.type,
		)?.waitingNodeTooltip;
		if (waitingNodeTooltipFromNodeType) {
			const activeExecutionId = useWorkflowsStore().activeExecutionId as string;
			// Use signed URLs from metadata if available
			// otherwise fall back to constructing URLs without token
			const additionalData: IWorkflowDataProxyAdditionalKeys = {
				$execution: {
					id: activeExecutionId,
					mode: 'test',
					resumeUrl:
						metadata?.resumeUrl ?? `${useRootStore().webhookWaitingUrl}/${activeExecutionId}`,
					resumeFormUrl:
						metadata?.resumeFormUrl ?? `${useRootStore().formWaitingUrl}/${activeExecutionId}`,
				},
			};
			if (workflow) {
				const tooltip = workflow.expression.getSimpleParameterValue(
					node,
					waitingNodeTooltipFromNodeType,
					'internal',
					additionalData,
				);

				return String(tooltip);
			} else if (waitingNodeTooltipFromNodeType) {
				return waitingNodeTooltipFromNodeType;
			}
		}
	} catch (error) {
		// do not throw error if could not compose tooltip
	}

	return '';
};

export { isTrimmedNodeExecutionData };

/**
 * Check whether task data contains a trimmed item.
 *
 * In manual executions in scaling mode, the payload in push messages may be
 * arbitrarily large. To protect Redis as it relays run data from workers to
 * the main process, we set a limit on payload size. If the payload is oversize,
 * we replace it with a placeholder, which is later overridden on execution
 * finish, when the client receives the full data.
 */
export function isTrimmedTaskData(taskData: ITaskData) {
	return taskData.data?.main?.some((main) => isTrimmedNodeExecutionData(main));
}

/**
 * Check whether task data contains a trimmed item.
 *
 * See {@link isTrimmedTaskData} for more details.
 */
export function hasTrimmedTaskData(taskData: ITaskData[]) {
	return taskData.some(isTrimmedTaskData);
}

/**
 * Check whether run data contains any trimmed items.
 *
 * See {@link hasTrimmedTaskData} for more details.
 */
export function hasTrimmedRunData(runData: IRunData) {
	return Object.keys(runData).some((nodeName) => hasTrimmedTaskData(runData[nodeName]));
}

export function executionRetryMessage(executionStatus: ExecutionStatus):
	| {
			title: string;
			type: 'error' | 'info' | 'success';
	  }
	| undefined {
	if (executionStatus === 'success') {
		return {
			title: i18n.baseText('executionsList.showMessage.retrySuccess.title'),
			type: 'success',
		};
	}

	if (executionStatus === 'waiting') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryWaiting.title'),
			type: 'info',
		};
	}

	if (executionStatus === 'running') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryRunning.title'),
			type: 'info',
		};
	}

	if (executionStatus === 'crashed') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryCrashed.title'),
			type: 'error',
		};
	}

	if (executionStatus === 'canceled') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryCanceled.title'),
			type: 'error',
		};
	}

	if (executionStatus === 'error') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryError.title'),
			type: 'error',
		};
	}

	return undefined;
}

/**
 * Returns the error message from the execution object if it exists,
 * or a fallback error message otherwise
 */
export function getExecutionErrorMessage({
	error,
	lastNodeExecuted,
}: {
	error?: ExecutionError;
	lastNodeExecuted?: string;
}): string {
	let errorMessage: string;

	if (lastNodeExecuted && error) {
		errorMessage = error.message ?? error.description ?? '';
	} else {
		errorMessage = i18n.baseText('pushConnection.executionError', {
			interpolate: { error: '!' },
		});

		if (error?.message) {
			let nodeName: string | undefined;
			if ('node' in error) {
				nodeName = typeof error.node === 'string' ? error.node : error.node?.name;
			}

			const receivedError = nodeName ? `${nodeName}: ${error.message}` : error.message;
			errorMessage = i18n.baseText('pushConnection.executionError', {
				interpolate: {
					error: `.${i18n.baseText('pushConnection.executionError.details', {
						interpolate: {
							details: receivedError,
						},
					})}`,
				},
			});
		}
	}

	return errorMessage;
}

export function getExecutionErrorToastConfiguration({
	error,
	lastNodeExecuted,
}: {
	error: ExecutionError;
	lastNodeExecuted?: string;
}) {
	const message = getExecutionErrorMessage({ error, lastNodeExecuted });

	if (error.name === 'SubworkflowOperationError') {
		return { title: error.message, message: error.description ?? '' };
	}

	if (
		(error.name === 'NodeOperationError' || error.name === 'NodeApiError') &&
		error.functionality === 'configuration-node'
	) {
		// If the error is a configuration error of the node itself doesn't get executed so we can't use lastNodeExecuted for the title
		const nodeErrorName = 'node' in error && error.node?.name ? error.node.name : '';

		return {
			title: nodeErrorName ? `Error in sub-node ‘${nodeErrorName}‘` : 'Problem executing workflow',
			message: h(NodeExecutionErrorMessage, {
				errorMessage: error.description ?? message,
				nodeName: nodeErrorName,
			}),
		};
	}

	return {
		title: lastNodeExecuted
			? `Problem in node ‘${lastNodeExecuted}‘`
			: 'Problem executing workflow',
		message,
	};
}

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
export function unflattenExecutionData(fullExecutionData: IExecutionFlattedResponse) {
	// Unflatten the data
	const returnData: IExecutionResponse = {
		...fullExecutionData,
		workflowData: fullExecutionData.workflowData,
		data: parse(fullExecutionData.data),
	};

	returnData.finished = returnData.finished ? returnData.finished : false;

	if (fullExecutionData.id) {
		returnData.id = fullExecutionData.id;
	}

	return returnData;
}

export function findTriggerNodeToAutoSelect(
	triggerNodes: INodeUi[],
	getNodeType: (type: string, typeVersion: number) => INodeTypeBaseDescription | null,
) {
	const autoSelectPriorities: Record<string, number | undefined> = {
		[FORM_TRIGGER_NODE_TYPE]: 10,
		[WEBHOOK_NODE_TYPE]: 9,
		// ..."Other apps"
		[SCHEDULE_TRIGGER_NODE_TYPE]: 7,
		[MANUAL_TRIGGER_NODE_TYPE]: 6,
		[WORKFLOW_TRIGGER_NODE_TYPE]: 5,
		[ERROR_TRIGGER_NODE_TYPE]: 4,
	};

	function isCoreNode(node: INodeUi): boolean {
		const nodeType = getNodeType(node.type, node.typeVersion);

		return nodeType?.codex?.categories?.includes(CORE_NODES_CATEGORY) ?? false;
	}

	return triggerNodes
		.toSorted((a, b) => {
			const aPriority = autoSelectPriorities[a.type] ?? (isCoreNode(a) ? 0 : 8);
			const bPriority = autoSelectPriorities[b.type] ?? (isCoreNode(b) ? 0 : 8);

			return bPriority - aPriority;
		})
		.find((node) => !node.disabled);
}

const MAX_ITEM_COUNT = 10;
const MAX_NESTING_DEPTH = 5;

export function generatePlaceholderValue(field: ExecutionPreviewSchemaField, depth = 0): unknown {
	if (depth > MAX_NESTING_DEPTH) {
		return field.type === 'object' ? {} : field.type === 'array' ? [] : '';
	}

	switch (field.type) {
		case 'string':
			return '';
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'object': {
			if (!field.fields?.length) return {};
			const obj: IDataObject = {};
			for (const child of field.fields) {
				obj[child.name] = generatePlaceholderValue(child, depth + 1) as IDataObject[string];
			}
			return obj;
		}
		case 'array': {
			if (!field.itemSchema?.length) return [];
			const element: IDataObject = {};
			for (const itemField of field.itemSchema) {
				element[itemField.name] = generatePlaceholderValue(
					itemField,
					depth + 1,
				) as IDataObject[string];
			}
			return [element];
		}
		default:
			return '';
	}
}

export function generateFakeDataFromSchema(
	outputSchema: ExecutionPreviewOutputSchema,
): INodeExecutionData[] {
	const itemCount = Math.max(1, Math.min(outputSchema.itemCount ?? 1, MAX_ITEM_COUNT));
	const items: INodeExecutionData[] = [];

	for (let i = 0; i < itemCount; i++) {
		const json: IDataObject = {};
		for (const field of outputSchema.fields) {
			json[field.name] = generatePlaceholderValue(field) as IDataObject[string];
		}
		items.push({ json });
	}

	return items;
}

/**
 * Builds a synthetic IExecutionResponse from a lightweight per-node execution schema.
 * When an outputSchema is provided, placeholder data is generated so the NDV can
 * display realistic columns/rows without exposing sensitive real data.
 */
export function buildExecutionResponseFromSchema({
	workflow,
	nodeExecutionSchema,
	executionStatus,
	executionError,
	lastNodeExecuted,
}: {
	workflow: IWorkflowDb;
	nodeExecutionSchema: Record<string, ExecutionPreviewNodeSchema>;
	executionStatus: ExecutionStatus;
	executionError?: {
		message: string;
		description?: string;
		name?: string;
		stack?: string;
	};
	lastNodeExecuted?: string;
}): IExecutionResponse {
	const runData: IRunData = {};

	for (const [nodeName, schema] of Object.entries(nodeExecutionSchema)) {
		const taskData: ITaskData = {
			startTime: 0,
			executionIndex: 0,
			executionTime: schema.executionTime ?? 0,
			executionStatus: schema.executionStatus,
			source: [],
		};

		if (schema.error) {
			// Preview errors are plain JSON objects from postMessage, not class instances.
			// They structurally match ExecutionError for rendering purposes.
			taskData.error = schema.error as unknown as ExecutionError;
		}

		if (schema.outputSchema && schema.outputSchema.fields.length > 0) {
			taskData.data = { main: [generateFakeDataFromSchema(schema.outputSchema)] };
		}

		runData[nodeName] = [taskData];
	}

	// Same as above: preview error is a serialized plain object, not an Error subclass instance.
	const resultError = executionError ? (executionError as unknown as ExecutionError) : undefined;

	const data = createRunExecutionData({
		resultData: {
			runData,
			error: resultError,
			lastNodeExecuted,
		},
		executionData: null,
	});

	return {
		id: 'preview',
		finished: executionStatus === 'success',
		mode: 'manual',
		status: executionStatus,
		startedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		data,
		workflowData: workflow,
	};
}

/**
 * Brand-cased labels for the caller `kind` discriminator. Centralized so the
 * three list/detail components agree on capitalization and forward-compat.
 */
export const CALLER_SOURCE_LABEL: Record<ExecutionCallerKind | string, string> = {
	mcp: 'MCP',
	cli: 'CLI',
	sdk: 'SDK',
	'instance-ai': 'Instance AI',
};

/**
 * Build just the "SOURCE (Name)" or "SOURCE" segment — no "via " prefix. Used
 * by the detail-view header, which already says "via {caller}" in its template.
 * Returns `''` when no caller is attached.
 */
export function getCallerDisplay(caller: ExecutionCaller | undefined): string {
	if (!caller) return '';
	const source = CALLER_SOURCE_LABEL[caller.kind] ?? caller.kind.toUpperCase();
	return caller.name && caller.name !== source ? `${source} (${caller.name})` : source;
}

/**
 * Compose the "via MCP (Claude Desktop)" sub-line shown on list rows. Returns
 * `''` when no caller is attached.
 */
export function getCallerLabel(caller: ExecutionCaller | undefined, locale: typeof i18n): string {
	const display = getCallerDisplay(caller);
	if (!display) return '';
	return locale.baseText('executionsList.singleNode.via', { interpolate: { caller: display } });
}

/**
 * Returns just the parenthesized caller-name suffix used alongside the kind
 * badge — e.g. "(Claude Desktop)". Empty when the caller has no distinct name.
 * Pairs with {@link CallerKindBadge} so the badge can render the kind and the
 * surrounding text can render the name independently.
 */
export function getCallerNameSuffix(caller: ExecutionCaller | undefined): string {
	if (!caller) return '';
	const source = CALLER_SOURCE_LABEL[caller.kind] ?? caller.kind.toUpperCase();
	return caller.name && caller.name !== source ? `(${caller.name})` : '';
}

/**
 * Resolve the most-specific human-friendly label we can build for a single-node
 * execution, falling back through the available fields in preference order:
 *   actionDisplayName → actionId → nodeType → caller.name → fallback.
 */
export function getSingleNodeHeadline(
	extras: SingleNodeExecutionSummaryExtras,
	fallback: string,
): string {
	return (
		extras.actionDisplayName ??
		extras.actionId ??
		extras.nodeType ??
		extras.caller?.name ??
		fallback
	);
}

/**
 * Hub placeholder workflows back single-node executions and aren't user-
 * authored. Centralize the prefix check so it's not duplicated across the
 * MainHeader, WorkflowDetails, and workflow service.
 */
export function isHubPlaceholderName(name: string | undefined): boolean {
	return !!name && (name.startsWith('__n8n-hub-action::') || name.startsWith('__n8n-hub-'));
}

/**
 * Render a hub placeholder workflow name as a friendly action label.
 * Examples:
 *   "__n8n-hub-action::n8n-nodes-base.slack.message.post" → "slack — message post"
 *   "__n8n-hub-action::httpRequest"                       → "httpRequest"
 *   "User-authored workflow"                              → "User-authored workflow"
 */
export function getFriendlyHubWorkflowName(name: string): string {
	if (!isHubPlaceholderName(name)) return name;
	const stripped = name.replace(/^__n8n-hub-action::/, '').replace(/^__n8n-hub-/, '');
	const parts = stripped.split('.');
	if (parts.length >= 3) {
		// Drop the package segment (e.g. "n8n-nodes-base"), keep service + operation.
		return `${parts[1]} — ${parts.slice(2).join(' ')}`;
	}
	return stripped;
}

/**
 * Short, display-friendly form of a sessionId — first `length` chars + ellipsis
 * when the id is longer. Keeps the list/header chrome tight while leaving the
 * full id reachable in tooltips and filter URLs.
 *
 * The default of 6 fits narrow contexts (per-row chips). Header contexts that
 * have more horizontal real estate (session group headers) can pass a larger
 * value such as 24 or 32 to expose more of the id.
 */
export function formatSessionShortId(sessionId: string | undefined, length: number = 6): string {
	if (!sessionId) return '';
	if (length <= 0) return '';
	return sessionId.length <= length ? sessionId : `${sessionId.slice(0, length)}…`;
}

/**
 * Minimum shape a row needs to participate in session grouping. Kept narrow so
 * both the global executions list and the credential executions tab — which
 * fetch slightly different row shapes — can share the same partitioner.
 */
export type SessionGroupableRow = {
	id?: string;
	mode: ExecutionSummary['mode'] | 'single-node';
	caller?: ExecutionCaller;
};

/** Helper for the partitioner — extract sessionId or undefined. */
export function getSessionGroupKey(row: SessionGroupableRow): string | undefined {
	if (row.mode !== 'single-node') return undefined;
	return row.caller?.sessionId;
}

export type ExecutionListEntry<TRow extends SessionGroupableRow = ExecutionSummaryWithScopes> =
	| { kind: 'row'; execution: TRow }
	| { kind: 'group'; sessionId: string; executions: TRow[] };

/**
 * Partition a list of executions into a mixed sequence of single rows and
 * session groups. A group is formed only when 2+ executions share a sessionId
 * (session-of-1 → flat row, per the design). Ordering: groups appear at the
 * position of their earliest call; ungrouped rows keep their input order.
 *
 * Generic over the row shape so credential executions (which lack `scopes`)
 * can reuse the same logic.
 */
export function partitionExecutionsBySession<TRow extends SessionGroupableRow>(
	executions: TRow[],
): Array<ExecutionListEntry<TRow>> {
	const sessionMap = new Map<string, TRow[]>();
	for (const exec of executions) {
		const key = getSessionGroupKey(exec);
		if (!key) continue;
		const bucket = sessionMap.get(key) ?? [];
		bucket.push(exec);
		sessionMap.set(key, bucket);
	}

	const result: Array<ExecutionListEntry<TRow>> = [];
	const consumed = new Set<string>();

	for (const exec of executions) {
		if (exec.id !== undefined && consumed.has(exec.id)) continue;
		const key = getSessionGroupKey(exec);
		const bucket = key ? sessionMap.get(key) : undefined;
		if (key && bucket && bucket.length > 1 && !consumed.has(`session:${key}`)) {
			result.push({ kind: 'group', sessionId: key, executions: bucket });
			consumed.add(`session:${key}`);
			bucket.forEach((b) => b.id !== undefined && consumed.add(b.id));
		} else {
			result.push({ kind: 'row', execution: exec });
			if (exec.id !== undefined) consumed.add(exec.id);
		}
	}

	return result;
}
