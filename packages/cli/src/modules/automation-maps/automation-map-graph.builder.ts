import type {
	AutomationMapCredential,
	AutomationMapDataTable,
	AutomationMapEdge,
	AutomationMapEdgeKind,
	AutomationMapGraph,
	AutomationMapScope,
	AutomationMapService,
	AutomationMapTrigger,
	AutomationMapWorkflow,
} from '@n8n/api-types';
import type { INode, IWorkflowSettings } from 'n8n-workflow';

export interface WorkflowSource {
	id: string;
	name: string;
	description: string | null;
	active: boolean;
	isArchived: boolean;
	nodes: INode[];
	settings: IWorkflowSettings | null;
	versionId: string;
	updatedAt: Date;
	parentFolderId: string | null;
	projectId: string | null;
	tags: string[];
}

export interface FolderSource {
	id: string;
	name: string;
	parentFolderId: string | null;
}

export interface DataTableSource {
	id: string;
	name: string;
	projectId: string;
}

export interface GraphBuilderContext {
	workflows: WorkflowSource[];
	folders: FolderSource[];
	dataTables: DataTableSource[];
	describeNodeType: (nodeType: string) => string | undefined;
	findWorkflowIdsInTable: (tableId: string) => Promise<string[]>;
}

const MAX_WORKFLOWS = 250;

const WORKFLOW_ID_PATTERN = /\b[A-Za-z0-9]{16}\b/g;

const URL_HOST_PATTERN = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/i;

const EXECUTE_WORKFLOW_TYPES = new Set([
	'n8n-nodes-base.executeWorkflow',
	'@n8n/n8n-nodes-langchain.toolWorkflow',
]);

const DATA_TABLE_TYPES = new Set(['n8n-nodes-base.dataTable', 'n8n-nodes-base.dataTableTool']);

const DATA_TABLE_READ_OPERATIONS = new Set(['get', 'rowExists', 'rowNotExists']);

const HTTP_REQUEST_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	'n8n-nodes-base.graphql',
]);

const CORE_NODE_TYPES = new Set(
	[
		'aggregate',
		'code',
		'compareDatasets',
		'compression',
		'convertToFile',
		'crypto',
		'dateTime',
		'debugHelper',
		'editImage',
		'errorTrigger',
		'executeCommand',
		'executeWorkflow',
		'executeWorkflowTrigger',
		'executionData',
		'extractFromFile',
		'filter',
		'form',
		'formTrigger',
		'function',
		'functionItem',
		'html',
		'if',
		'itemLists',
		'limit',
		'manualTrigger',
		'markdown',
		'merge',
		'noOp',
		'readWriteFile',
		'removeDuplicates',
		'renameKeys',
		'respondToWebhook',
		'scheduleTrigger',
		'cron',
		'interval',
		'set',
		'sort',
		'splitInBatches',
		'splitOut',
		'stickyNote',
		'stopAndError',
		'summarize',
		'switch',
		'wait',
		'webhook',
		'xml',
		'dataTable',
		'dataTableTool',
		'httpRequest',
		'httpRequestTool',
		'start',
	].map((name) => `n8n-nodes-base.${name}`),
);

const KNOWN_HOSTS: Array<{ match: RegExp; nodeType: string; name: string }> = [
	{ match: /(^|\.)github\.com$/, nodeType: 'n8n-nodes-base.github', name: 'GitHub' },
	{ match: /(^|\.)linear\.app$/, nodeType: 'n8n-nodes-base.linear', name: 'Linear' },
	{ match: /(^|\.)slack\.com$/, nodeType: 'n8n-nodes-base.slack', name: 'Slack' },
	{ match: /(^|\.)notion\.com$/, nodeType: 'n8n-nodes-base.notion', name: 'Notion' },
	{ match: /(^|\.)openai\.com$/, nodeType: 'n8n-nodes-base.openAi', name: 'OpenAI' },
	{
		match: /(^|\.)anthropic\.com$/,
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		name: 'Anthropic',
	},
	{ match: /(^|\.)googleapis\.com$/, nodeType: 'n8n-nodes-base.googleSheets', name: 'Google' },
	{ match: /(^|\.)sentry\.io$/, nodeType: 'n8n-nodes-base.sentryIo', name: 'Sentry' },
	{ match: /(^|\.)atlassian\.net$/, nodeType: 'n8n-nodes-base.jira', name: 'Jira' },
	{ match: /(^|\.)posthog\.com$/, nodeType: 'n8n-nodes-base.postHog', name: 'PostHog' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringParam(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (isRecord(value) && typeof value.value === 'string') return value.value;
	return undefined;
}

function resourceLocatorMode(value: unknown): string | undefined {
	return isRecord(value) && typeof value.mode === 'string' ? value.mode : undefined;
}

function isExpression(value: string) {
	return value.startsWith('=');
}

function humanize(value: string) {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/^./, (char) => char.toUpperCase())
		.trim();
}

function baseNodeName(nodeType: string) {
	return nodeType.split('.').pop() ?? nodeType;
}

function serviceNodeType(nodeType: string) {
	return nodeType.replace(/Trigger$/, '').replace(/Tool$/, '');
}

function scheduleLabel(parameters: INode['parameters']) {
	const rule: unknown = parameters.rule;
	const intervals = isRecord(rule) ? rule.interval : undefined;
	const interval: unknown = Array.isArray(intervals) ? intervals[0] : undefined;
	if (!isRecord(interval)) return 'On a schedule';
	if (typeof interval.expression === 'string') return `Cron ${interval.expression}`;
	const field = typeof interval.field === 'string' ? interval.field : 'days';
	const amountKey = `${field}Interval`;
	const amount = typeof interval[amountKey] === 'number' ? interval[amountKey] : 1;
	const unit = field.replace(/s$/, '');
	return amount === 1 ? `Every ${unit}` : `Every ${amount} ${field}`;
}

function triggerFor(
	node: INode,
	describeNodeType: GraphBuilderContext['describeNodeType'],
): AutomationMapTrigger | undefined {
	const type = node.type;
	const name = baseNodeName(type);
	const parameters = node.parameters ?? {};
	if (name === 'scheduleTrigger' || name === 'cron' || name === 'interval') {
		return { kind: 'schedule', nodeType: type, label: scheduleLabel(parameters) };
	}
	if (name === 'webhook') {
		const method = typeof parameters.httpMethod === 'string' ? parameters.httpMethod : 'GET';
		const path = typeof parameters.path === 'string' ? parameters.path : '';
		return { kind: 'webhook', nodeType: type, label: `${method} /webhook/${path}` };
	}
	if (name === 'formTrigger') return { kind: 'form', nodeType: type, label: 'Form submission' };
	if (name === 'chatTrigger') return { kind: 'chat', nodeType: type, label: 'Chat message' };
	if (name === 'mcpTrigger') return { kind: 'mcp', nodeType: type, label: 'MCP server' };
	if (name === 'executeWorkflowTrigger') {
		return { kind: 'subworkflow', nodeType: type, label: 'Called by another workflow' };
	}
	if (name === 'errorTrigger') {
		return { kind: 'error', nodeType: type, label: 'Another workflow fails' };
	}
	if (name === 'manualTrigger') return { kind: 'manual', nodeType: type, label: 'Manual run' };
	if (/Trigger$/.test(name)) {
		const displayName = describeNodeType(type) ?? humanize(name);
		const event = typeof parameters.event === 'string' ? ` · ${parameters.event}` : '';
		return { kind: 'app', nodeType: type, label: `${displayName}${event}` };
	}
	return undefined;
}

function folderPathFor(folderId: string | null, foldersById: Map<string, FolderSource>) {
	const names: string[] = [];
	let current = folderId ? foldersById.get(folderId) : undefined;
	while (current && names.length < 10) {
		names.unshift(current.name);
		current = current.parentFolderId ? foldersById.get(current.parentFolderId) : undefined;
	}
	return names.join(' / ');
}

function folderAncestry(folderId: string | null, foldersById: Map<string, FolderSource>) {
	const ids: string[] = [];
	let current = folderId ? foldersById.get(folderId) : undefined;
	while (current && ids.length < 10) {
		ids.push(current.id);
		current = current.parentFolderId ? foldersById.get(current.parentFolderId) : undefined;
	}
	return ids;
}

export function stickyNoteText(nodes: INode[]) {
	return nodes
		.filter((node) => node.type === 'n8n-nodes-base.stickyNote')
		.map((node) => stringParam(node.parameters?.content) ?? '')
		.join(' ')
		.replace(/^#+\s*/gm, '')
		.replace(/\*\*/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 600);
}

function matchesKeyword(haystack: string, keyword: string) {
	return haystack.toLowerCase().includes(keyword.toLowerCase());
}

export function selectScopedWorkflowIds(
	scope: AutomationMapScope,
	workflows: WorkflowSource[],
	folders: FolderSource[],
) {
	const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
	const selected = new Set<string>();
	for (const workflow of workflows) {
		if (workflow.isArchived) continue;
		const ancestry = folderAncestry(workflow.parentFolderId, foldersById);
		const searchable = [
			workflow.name,
			workflow.description ?? '',
			workflow.tags.join(' '),
			folderPathFor(workflow.parentFolderId, foldersById),
		].join(' ');
		const matched =
			scope.workflowIds.includes(workflow.id) ||
			ancestry.some((id) => scope.folderIds.includes(id)) ||
			workflow.tags.some((tag) => scope.tags.includes(tag)) ||
			scope.keywords.some((keyword) => matchesKeyword(searchable, keyword));
		if (matched) selected.add(workflow.id);
	}
	return selected;
}

interface EdgeCollector {
	add(
		kind: AutomationMapEdgeKind,
		source: string,
		target: string,
		nodeName?: string,
		via?: string,
	): void;
	list(): AutomationMapEdge[];
}

function createEdgeCollector(): EdgeCollector {
	const edges = new Map<string, AutomationMapEdge>();
	return {
		add(kind, source, target, nodeName, via) {
			if (source === target) return;
			const id = `${kind}:${source}->${target}`;
			const existing = edges.get(id);
			if (existing) {
				if (nodeName && !existing.nodeNames.includes(nodeName)) existing.nodeNames.push(nodeName);
				return;
			}
			edges.set(id, {
				id,
				kind,
				source,
				target,
				via: via ?? null,
				nodeNames: nodeName ? [nodeName] : [],
			});
		},
		list: () => [...edges.values()],
	};
}

export const workflowNodeId = (id: string) => `wf:${id}`;
export const dataTableNodeId = (id: string) => `dt:${id}`;
export const serviceNodeId = (key: string) => `svc:${key}`;

export async function buildAutomationMapGraph(
	scope: AutomationMapScope,
	context: GraphBuilderContext,
): Promise<AutomationMapGraph> {
	const workflowsById = new Map(context.workflows.map((workflow) => [workflow.id, workflow]));
	const foldersById = new Map(context.folders.map((folder) => [folder.id, folder]));
	const tablesById = new Map(context.dataTables.map((table) => [table.id, table]));
	const tablesByName = new Map(context.dataTables.map((table) => [table.name, table]));

	const scopedIds = selectScopedWorkflowIds(scope, context.workflows, context.folders);
	const queue = [...scopedIds];
	const visited = new Set<string>();
	const missingWorkflowIds = new Set<string>();
	const unresolvedDynamic = new Set<string>();
	const usedTables = new Map<string, AutomationMapDataTable>();
	const services = new Map<string, AutomationMapService>();
	const edges = createEdgeCollector();
	const tableWorkflowRefs = new Map<string, string[]>();

	const enqueue = (workflowId: string) => {
		if (visited.has(workflowId) || queue.includes(workflowId)) return;
		if (!workflowsById.has(workflowId)) {
			missingWorkflowIds.add(workflowId);
			return;
		}
		queue.push(workflowId);
	};

	const workflowIdsInTable = async (tableId: string) => {
		const cached = tableWorkflowRefs.get(tableId);
		if (cached) return cached;
		const ids = await context.findWorkflowIdsInTable(tableId);
		tableWorkflowRefs.set(tableId, ids);
		return ids;
	};

	const registerTable = (tableId: string) => {
		if (usedTables.has(tableId)) return;
		const table = tablesById.get(tableId);
		usedTables.set(tableId, {
			id: tableId,
			name: table?.name ?? tableId,
			projectId: table?.projectId ?? null,
			missing: !table,
		});
	};

	const registerService = (node: INode) => {
		const credentials: AutomationMapCredential[] = Object.entries(node.credentials ?? {})
			.filter(([, details]) => details?.id)
			.map(([type, details]) => ({ id: details.id ?? '', name: details.name, type }));

		let key: string;
		let service: Omit<AutomationMapService, 'credentials'>;
		if (HTTP_REQUEST_TYPES.has(node.type)) {
			const url = stringParam(node.parameters?.url) ?? stringParam(node.parameters?.endpoint) ?? '';
			const host = URL_HOST_PATTERN.exec(url)?.[1]?.toLowerCase();
			if (!host && credentials.length === 0) return undefined;
			const known = host ? KNOWN_HOSTS.find((entry) => entry.match.test(host)) : undefined;
			key = known ? known.nodeType : `host:${host ?? credentials[0].type}`;
			service = {
				key,
				name: known?.name ?? host ?? humanize(credentials[0].type),
				nodeType: known?.nodeType ?? null,
				host: host ?? null,
			};
		} else {
			if (CORE_NODE_TYPES.has(node.type)) return undefined;
			const isLangchainHelper =
				node.type.startsWith('@n8n/n8n-nodes-langchain.') &&
				!/\.(lmChat|lm|embeddings)/.test(node.type);
			if (isLangchainHelper && credentials.length === 0) return undefined;
			const nodeType = serviceNodeType(node.type);
			key = nodeType;
			service = {
				key,
				name:
					context.describeNodeType(nodeType) ??
					context.describeNodeType(node.type) ??
					humanize(baseNodeName(nodeType)),
				nodeType,
				host: null,
			};
		}

		const existing = services.get(key);
		if (existing) {
			for (const credential of credentials) {
				if (!existing.credentials.some((entry) => entry.id === credential.id)) {
					existing.credentials.push(credential);
				}
			}
		} else {
			services.set(key, { ...service, credentials });
		}
		return key;
	};

	const mapWorkflows: AutomationMapWorkflow[] = [];

	while (queue.length > 0 && visited.size < MAX_WORKFLOWS) {
		const workflowId = queue.shift();
		if (!workflowId || visited.has(workflowId)) continue;
		visited.add(workflowId);
		const workflow = workflowsById.get(workflowId);
		if (!workflow) continue;

		const source = workflowNodeId(workflow.id);
		const triggers: AutomationMapTrigger[] = [];
		const tablesRead: string[] = [];
		let hasDynamicCall = false;
		const enabledNodes = workflow.nodes.filter((node) => !node.disabled);

		for (const node of enabledNodes) {
			const parameters = node.parameters ?? {};
			const trigger = triggerFor(node, context.describeNodeType);
			if (trigger) triggers.push(trigger);

			const linkedIds = new Set<string>();

			if (EXECUTE_WORKFLOW_TYPES.has(node.type) && parameters.source !== 'parameter') {
				const target = stringParam(parameters.workflowId);
				if (target && !isExpression(target)) {
					linkedIds.add(target);
					edges.add('calls', source, workflowNodeId(target), node.name);
					enqueue(target);
				} else if (target) {
					const literalIds = (target.match(WORKFLOW_ID_PATTERN) ?? []).filter((id) =>
						workflowsById.has(id),
					);
					for (const id of literalIds) {
						linkedIds.add(id);
						edges.add('calls', source, workflowNodeId(id), node.name);
						enqueue(id);
					}
					if (literalIds.length === 0) hasDynamicCall = true;
				}
			}

			if (DATA_TABLE_TYPES.has(node.type) && parameters.resource !== 'table') {
				const tableValue = stringParam(parameters.dataTableId);
				const tableId =
					tableValue && !isExpression(tableValue)
						? resourceLocatorMode(parameters.dataTableId) === 'name'
							? tablesByName.get(tableValue)?.id
							: tableValue
						: undefined;
				if (tableId) {
					registerTable(tableId);
					const operation =
						typeof parameters.operation === 'string' ? parameters.operation : 'insert';
					const isRead = DATA_TABLE_READ_OPERATIONS.has(operation);
					if (isRead) {
						tablesRead.push(tableId);
						edges.add('reads', dataTableNodeId(tableId), source, node.name);
					} else {
						edges.add('writes', source, dataTableNodeId(tableId), node.name);
					}
				}
			}

			const serviceKey = registerService(node);
			if (serviceKey) edges.add('uses', source, serviceNodeId(serviceKey), node.name);

			if (node.type !== 'n8n-nodes-base.stickyNote') {
				const serialized = JSON.stringify(parameters);
				for (const id of serialized.match(WORKFLOW_ID_PATTERN) ?? []) {
					if (id === workflow.id || linkedIds.has(id) || !workflowsById.has(id)) continue;
					edges.add('references', source, workflowNodeId(id), node.name);
					enqueue(id);
				}
			}
		}

		const errorWorkflow = workflow.settings?.errorWorkflow;
		if (typeof errorWorkflow === 'string' && errorWorkflow) {
			edges.add('errorHandler', source, workflowNodeId(errorWorkflow), undefined, 'Error workflow');
			enqueue(errorWorkflow);
		}

		if (hasDynamicCall) {
			let resolved = false;
			for (const tableId of tablesRead) {
				const tableName = usedTables.get(tableId)?.name ?? tableId;
				for (const id of await workflowIdsInTable(tableId)) {
					if (id === workflow.id) continue;
					edges.add('dispatches', source, workflowNodeId(id), undefined, tableName);
					enqueue(id);
					resolved = true;
				}
			}
			if (!resolved) unresolvedDynamic.add(workflow.id);
		}

		mapWorkflows.push({
			id: workflow.id,
			name: workflow.name,
			description: workflow.description?.trim() ?? '',
			active: workflow.active,
			archived: workflow.isArchived,
			missing: false,
			folderId: workflow.parentFolderId,
			folderPath: folderPathFor(workflow.parentFolderId, foldersById),
			projectId: workflow.projectId,
			tags: workflow.tags,
			triggers,
			nodeCount: enabledNodes.filter((node) => node.type !== 'n8n-nodes-base.stickyNote').length,
			hasUnresolvedDynamicCall: unresolvedDynamic.has(workflow.id),
			versionId: workflow.versionId,
			updatedAt: workflow.updatedAt.toISOString(),
			inScope: scopedIds.has(workflow.id),
		});
	}

	for (const tableId of usedTables.keys()) {
		const tableName = usedTables.get(tableId)?.name ?? tableId;
		for (const id of await workflowIdsInTable(tableId)) {
			if (!visited.has(id)) continue;
			const alreadyDispatched = edges
				.list()
				.some((edge) => edge.kind === 'dispatches' && edge.target === workflowNodeId(id));
			if (!alreadyDispatched) {
				edges.add('references', dataTableNodeId(tableId), workflowNodeId(id), undefined, tableName);
			}
		}
	}

	for (const id of missingWorkflowIds) {
		mapWorkflows.push({
			id,
			name: `Unavailable workflow (${id})`,
			description: 'This workflow does not exist or you do not have access to it.',
			active: false,
			archived: false,
			missing: true,
			folderId: null,
			folderPath: '',
			projectId: null,
			tags: [],
			triggers: [],
			nodeCount: 0,
			hasUnresolvedDynamicCall: false,
			versionId: '',
			updatedAt: new Date(0).toISOString(),
			inScope: false,
		});
	}

	const presentNodeIds = new Set([
		...mapWorkflows.map((workflow) => workflowNodeId(workflow.id)),
		...[...usedTables.keys()].map(dataTableNodeId),
		...[...services.keys()].map(serviceNodeId),
	]);

	return {
		workflows: mapWorkflows,
		dataTables: [...usedTables.values()],
		services: [...services.values()],
		edges: edges
			.list()
			.filter((edge) => presentNodeIds.has(edge.source) && presentNodeIds.has(edge.target)),
	};
}

export function fingerprintFor(graph: AutomationMapGraph) {
	return Object.fromEntries(
		graph.workflows
			.filter((workflow) => !workflow.missing)
			.map((workflow) => [workflow.id, workflow.versionId]),
	);
}
