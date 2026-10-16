import type {
	AutomationMapDynamicCall,
	AutomationMapIconSource,
	AutomationMapTrigger,
	AutomationMapTriggerKind,
} from '@n8n/api-types';
import type { INode, IWorkflowSettings } from 'n8n-workflow';
import { DATA_TABLE_NODE_TYPES, isNodeWithWorkflowSelector } from 'n8n-workflow';

export interface NodeTypeFacts {
	displayName: string;
	isTrigger: boolean;
	isCore: boolean;
	icon: AutomationMapIconSource | null;
}

export interface CredentialTypeFacts {
	displayName: string;
	isGeneric: boolean;
	icon: AutomationMapIconSource | null;
}

export interface TypeDescriber {
	describeNode(type: string, version: number): NodeTypeFacts | undefined;
	describeCredential(type: string): CredentialTypeFacts | undefined;
}

export interface StaticCall {
	targetId: string;
	nodeName: string;
	kind: 'calls' | 'errorHandler';
}

export interface DataTableUse {
	id: string;
	name?: string;
	access: 'reads' | 'writes';
	nodeName: string;
}

export interface CredentialUse {
	id: string;
	name: string;
	type: string;
	nodeName: string;
}

export interface ServiceUse {
	serviceId: string;
	name: string;
	icon: AutomationMapIconSource | null;
	host?: string;
	nodeName: string;
}

export interface WebhookEndpoint {
	method: string;
	path: string;
}

export interface OutgoingUrl {
	url: string;
	nodeName: string;
}

export interface DynamicCallFacts extends AutomationMapDynamicCall {
	propertyNames: string[];
}

export interface WorkflowFacts {
	triggers: AutomationMapTrigger[];
	staticCalls: StaticCall[];
	dynamicCalls: DynamicCallFacts[];
	dataTables: DataTableUse[];
	credentials: CredentialUse[];
	services: ServiceUse[];
	webhooks: WebhookEndpoint[];
	outgoingUrls: OutgoingUrl[];
}

interface ExtractableWorkflow {
	nodes: INode[];
	settings?: IWorkflowSettings | null;
}

const TRIGGER_KIND_BY_TYPE: Record<string, AutomationMapTriggerKind> = {
	'n8n-nodes-base.scheduleTrigger': 'schedule',
	'n8n-nodes-base.cron': 'schedule',
	'n8n-nodes-base.interval': 'schedule',
	'n8n-nodes-base.webhook': 'webhook',
	'n8n-nodes-base.formTrigger': 'form',
	'@n8n/n8n-nodes-langchain.chatTrigger': 'chat',
	'n8n-nodes-base.executeWorkflowTrigger': 'subworkflow',
	'n8n-nodes-base.manualTrigger': 'manual',
	'n8n-nodes-base.errorTrigger': 'error',
	'@n8n/n8n-nodes-langchain.mcpTrigger': 'mcp',
	'n8n-nodes-base.evaluationTrigger': 'evaluation',
};

const READ_OPERATIONS = new Set(['get', 'rowExists', 'rowNotExists', 'list', 'getAll']);

const HTTP_URL_PARAMETER_BY_TYPE: Record<string, string> = {
	'n8n-nodes-base.httpRequest': 'url',
	'n8n-nodes-base.httpRequestTool': 'url',
	'@n8n/n8n-nodes-langchain.toolHttpRequest': 'url',
	'n8n-nodes-base.graphql': 'endpoint',
};

interface KnownHost {
	name: string;
	nodeType: string;
}

const KNOWN_HOSTS: Array<{ pattern: RegExp; host: KnownHost }> = [
	{ pattern: /(^|\.)github\.com$/, host: { name: 'GitHub', nodeType: 'n8n-nodes-base.github' } },
	{ pattern: /(^|\.)linear\.app$/, host: { name: 'Linear', nodeType: 'n8n-nodes-base.linear' } },
	{ pattern: /(^|\.)slack\.com$/, host: { name: 'Slack', nodeType: 'n8n-nodes-base.slack' } },
	{ pattern: /(^|\.)notion\.com$/, host: { name: 'Notion', nodeType: 'n8n-nodes-base.notion' } },
	{
		pattern: /(^|\.)anthropic\.com$/,
		host: { name: 'Anthropic', nodeType: '@n8n/n8n-nodes-langchain.anthropic' },
	},
	{
		pattern: /(^|\.)openai\.com$/,
		host: { name: 'OpenAI', nodeType: '@n8n/n8n-nodes-langchain.openAi' },
	},
	{
		pattern: /bigquery\.googleapis\.com$/,
		host: { name: 'Google BigQuery', nodeType: 'n8n-nodes-base.googleBigQuery' },
	},
	{ pattern: /(^|\.)sentry\.io$/, host: { name: 'Sentry.io', nodeType: 'n8n-nodes-base.sentryIo' } },
	{ pattern: /(^|\.)jira\.com$|atlassian\.net$/, host: { name: 'Jira', nodeType: 'n8n-nodes-base.jira' } },
	{ pattern: /registry\.npmjs\.org$/, host: { name: 'npm', nodeType: 'n8n-nodes-base.npm' } },
];

const SERVICE_NAME_SUFFIXES = [
	/\s+trigger$/i,
	/\s+tool$/i,
	/\s+chat model$/i,
	/\s+model$/i,
	/\s+oauth2 api$/i,
	/\s+oauth2$/i,
	/\s+app api$/i,
	/\s+api$/i,
];

export function toServiceId(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function cleanServiceName(displayName: string): string {
	let name = displayName.trim();
	for (const suffix of SERVICE_NAME_SUFFIXES) {
		name = name.replace(suffix, '');
	}
	return name.trim() || displayName.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function readResourceLocatorValue(value: unknown): { value?: string; cachedName?: string } {
	if (typeof value === 'string') return { value };
	if (isRecord(value)) {
		return {
			value: readString(value.value),
			cachedName: readString(value.cachedResultName),
		};
	}
	return {};
}

function isExpression(value: string): boolean {
	return value.trim().startsWith('=');
}

export function extractPropertyNames(expression: string): string[] {
	const names = new Set<string>();
	for (const match of expression.matchAll(/\.json\??\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
		names.add(match[1]);
	}
	for (const match of expression.matchAll(/\.json\[\s*['"]([^'"]+)['"]\s*\]/g)) {
		names.add(match[1]);
	}
	for (const match of expression.matchAll(/\$json\??\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
		names.add(match[1]);
	}
	return [...names];
}

function pluralize(count: number, unit: string): string {
	return count === 1 ? `Every ${unit}` : `Every ${count} ${unit}s`;
}

function formatHour(hour: number | undefined): string {
	if (hour === undefined) return '';
	return ` at ${String(hour).padStart(2, '0')}:00`;
}

export function describeSchedule(node: INode): string {
	const rule = node.parameters?.rule;
	const intervals = isRecord(rule) && Array.isArray(rule.interval) ? rule.interval : [];
	const first: unknown = intervals[0];
	if (!isRecord(first)) return 'Every day';
	const field = readString(first.field) ?? 'days';
	switch (field) {
		case 'seconds':
			return pluralize(readNumber(first.secondsInterval) ?? 30, 'second');
		case 'minutes':
			return pluralize(readNumber(first.minutesInterval) ?? 5, 'minute');
		case 'hours':
			return pluralize(readNumber(first.hoursInterval) ?? 1, 'hour');
		case 'days':
			return `${pluralize(readNumber(first.daysInterval) ?? 1, 'day')}${formatHour(readNumber(first.triggerAtHour))}`;
		case 'weeks':
			return `${pluralize(readNumber(first.weeksInterval) ?? 1, 'week')}${formatHour(readNumber(first.triggerAtHour))}`;
		case 'months':
			return `${pluralize(readNumber(first.monthsInterval) ?? 1, 'month')}${formatHour(readNumber(first.triggerAtHour))}`;
		case 'cronExpression':
			return `Cron ${readString(first.expression) ?? ''}`.trim();
		default:
			return 'On a schedule';
	}
}

function webhookMethods(node: INode): string[] {
	const parameters = node.parameters ?? {};
	if (parameters.multipleMethods === true && Array.isArray(parameters.httpMethod)) {
		return parameters.httpMethod.filter((method): method is string => typeof method === 'string');
	}
	return [readString(parameters.httpMethod) ?? 'GET'];
}

function describeTrigger(
	node: INode,
	kind: AutomationMapTriggerKind,
	facts: NodeTypeFacts | undefined,
): string {
	const path = readString(node.parameters?.path) ?? '';
	switch (kind) {
		case 'schedule':
			return describeSchedule(node);
		case 'webhook':
			return `${webhookMethods(node).join(', ')} /webhook/${path}`;
		case 'form':
			return `Form /form/${path}`;
		case 'chat':
			return 'Chat message';
		case 'subworkflow':
			return 'Called by another workflow';
		case 'manual':
			return 'Manual run';
		case 'error':
			return 'Another workflow fails';
		case 'mcp':
			return `MCP server /mcp/${path}`;
		case 'evaluation':
			return 'Evaluation run';
		case 'app':
			return facts ? `${cleanServiceName(facts.displayName)} event` : node.type;
	}
}

function calledWorkflowId(node: INode): string | undefined {
	const parameters = node.parameters ?? {};
	const source = readString(parameters.source);
	if (source === 'parameter' || source === 'localFile' || source === 'url') return undefined;
	return readResourceLocatorValue(parameters.workflowId).value;
}

function dataTableAccess(node: INode): 'reads' | 'writes' {
	const operation = readString(node.parameters?.operation);
	const resource = readString(node.parameters?.resource) ?? 'row';
	if (node.type === 'n8n-nodes-base.evaluationTrigger') return 'reads';
	if (resource === 'table') return operation === 'list' ? 'reads' : 'writes';
	return operation !== undefined && READ_OPERATIONS.has(operation) ? 'reads' : 'writes';
}

export function extractHost(url: string): string | undefined {
	const literal = url.replace(/^=/, '').trim();
	const match = /^https?:\/\/([^/{}\s?#:]+)/i.exec(literal);
	return match ? match[1].toLowerCase() : undefined;
}

export function knownHost(host: string): KnownHost | undefined {
	return KNOWN_HOSTS.find(({ pattern }) => pattern.test(host))?.host;
}

function hostService(
	host: string,
	describer: TypeDescriber,
	nodeName: string,
): ServiceUse {
	const known = knownHost(host);
	if (known) {
		const facts = describer.describeNode(known.nodeType, 1);
		return {
			serviceId: toServiceId(known.name),
			name: known.name,
			icon: facts?.icon ?? null,
			host,
			nodeName,
		};
	}
	return {
		serviceId: toServiceId(host),
		name: host,
		icon: { type: 'icon', name: 'globe' },
		host,
		nodeName,
	};
}

function credentialServices(
	node: INode,
	describer: TypeDescriber,
): ServiceUse[] {
	const services: ServiceUse[] = [];
	for (const credentialType of Object.keys(node.credentials ?? {})) {
		const facts = describer.describeCredential(credentialType);
		if (!facts || facts.isGeneric) continue;
		const name = cleanServiceName(facts.displayName);
		services.push({
			serviceId: toServiceId(name),
			name,
			icon: facts.icon,
			nodeName: node.name,
		});
	}
	return services;
}

function predefinedCredentialService(node: INode, describer: TypeDescriber): ServiceUse[] {
	const credentialType = readString(node.parameters?.nodeCredentialType);
	if (!credentialType) return [];
	const facts = describer.describeCredential(credentialType);
	if (!facts || facts.isGeneric) return [];
	const name = cleanServiceName(facts.displayName);
	return [{ serviceId: toServiceId(name), name, icon: facts.icon, nodeName: node.name }];
}

export function extractWorkflowFacts(
	workflow: ExtractableWorkflow,
	describer: TypeDescriber,
): WorkflowFacts {
	const facts: WorkflowFacts = {
		triggers: [],
		staticCalls: [],
		dynamicCalls: [],
		dataTables: [],
		credentials: [],
		services: [],
		webhooks: [],
		outgoingUrls: [],
	};

	for (const node of workflow.nodes ?? []) {
		if (node.disabled || node.type === 'n8n-nodes-base.stickyNote') continue;
		const nodeFacts = describer.describeNode(node.type, node.typeVersion);

		const triggerKind =
			TRIGGER_KIND_BY_TYPE[node.type] ?? (nodeFacts?.isTrigger ? 'app' : undefined);
		if (triggerKind) {
			const appService =
				triggerKind === 'app' && nodeFacts
					? toServiceId(cleanServiceName(nodeFacts.displayName))
					: undefined;
			facts.triggers.push({
				kind: triggerKind,
				nodeName: node.name,
				nodeType: node.type,
				label: describeTrigger(node, triggerKind, nodeFacts),
				...(appService ? { serviceId: appService } : {}),
			});
		}

		if (node.type === 'n8n-nodes-base.webhook') {
			const path = readString(node.parameters?.path);
			if (path) {
				for (const method of webhookMethods(node)) facts.webhooks.push({ method, path });
			}
		}

		if (isNodeWithWorkflowSelector(node)) {
			const targetId = calledWorkflowId(node);
			if (targetId && isExpression(targetId)) {
				facts.dynamicCalls.push({
					nodeName: node.name,
					expression: targetId.replace(/^=/, '').trim(),
					propertyNames: extractPropertyNames(targetId),
				});
			} else if (targetId) {
				facts.staticCalls.push({ targetId, nodeName: node.name, kind: 'calls' });
			}
		}

		if (DATA_TABLE_NODE_TYPES.includes(node.type)) {
			const { value, cachedName } = readResourceLocatorValue(node.parameters?.dataTableId);
			if (value && !isExpression(value) && !value.includes('{')) {
				facts.dataTables.push({
					id: value,
					...(cachedName ? { name: cachedName } : {}),
					access: dataTableAccess(node),
					nodeName: node.name,
				});
			}
		}

		for (const [type, details] of Object.entries(node.credentials ?? {})) {
			if (!details?.id) continue;
			facts.credentials.push({
				id: details.id,
				name: details.name,
				type,
				nodeName: node.name,
			});
		}

		const urlParameter = HTTP_URL_PARAMETER_BY_TYPE[node.type];
		const url = urlParameter ? readString(node.parameters?.[urlParameter]) : undefined;
		if (url) facts.outgoingUrls.push({ url, nodeName: node.name });

		const services: ServiceUse[] = [];
		if (nodeFacts && !nodeFacts.isCore) {
			const name = cleanServiceName(nodeFacts.displayName);
			services.push({
				serviceId: toServiceId(name),
				name,
				icon: nodeFacts.icon,
				nodeName: node.name,
			});
		} else {
			services.push(...credentialServices(node, describer));
			services.push(...predefinedCredentialService(node, describer));
			const host = url ? extractHost(url) : undefined;
			if (host && services.length === 0 && !isLocalHost(host)) {
				services.push(hostService(host, describer, node.name));
			}
		}
		facts.services.push(...services);
	}

	const errorWorkflow = workflow.settings?.errorWorkflow;
	if (typeof errorWorkflow === 'string' && errorWorkflow && errorWorkflow !== 'DEFAULT') {
		facts.staticCalls.push({ targetId: errorWorkflow, nodeName: 'Workflow settings', kind: 'errorHandler' });
	}

	return facts;
}

function isLocalHost(host: string): boolean {
	return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

export function findWebhookPathInUrl(url: string, paths: Iterable<string>): string | undefined {
	const literal = url.replace(/^=/, '');
	const match = /\/webhook(?:-test)?\/([^?#{}\s]+)/.exec(literal);
	if (!match) return undefined;
	const requested = match[1].replace(/\/+$/, '');
	for (const path of paths) {
		if (path.replace(/^\/+|\/+$/g, '') === requested) return path;
	}
	return undefined;
}

const WORKFLOW_ID_CANDIDATE = /\b[A-Za-z0-9]{16}\b/g;

export function collectWorkflowIdCandidates(value: unknown, into: Set<string>): void {
	if (typeof value === 'string') {
		for (const match of value.matchAll(WORKFLOW_ID_CANDIDATE)) into.add(match[0]);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectWorkflowIdCandidates(item, into);
		return;
	}
	if (isRecord(value)) {
		for (const item of Object.values(value)) collectWorkflowIdCandidates(item, into);
	}
}

function parseJsonObject(value: string): Record<string, unknown> | undefined {
	const trimmed = value.trim();
	if (!trimmed.startsWith('{')) return undefined;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

export interface DynamicTarget {
	workflowId: string;
	columnPath: string;
}

export function findDynamicTargetsInRows(
	rows: Array<Record<string, unknown>>,
	propertyNames: string[],
	existingWorkflowIds: Set<string>,
	options: { allowWorkflowNamedColumns: boolean },
): DynamicTarget[] {
	const targets = new Map<string, DynamicTarget>();
	const wanted = new Set(propertyNames);
	const add = (workflowId: unknown, columnPath: string) => {
		if (typeof workflowId !== 'string' || !existingWorkflowIds.has(workflowId)) return;
		if (!targets.has(workflowId)) targets.set(workflowId, { workflowId, columnPath });
	};

	for (const row of rows) {
		for (const [column, value] of Object.entries(row)) {
			if (wanted.has(column)) add(value, column);
			else if (options.allowWorkflowNamedColumns && /workflow/i.test(column)) add(value, column);

			if (typeof value !== 'string') continue;
			const nested = parseJsonObject(value);
			if (!nested) continue;
			for (const [key, nestedValue] of Object.entries(nested)) {
				if (wanted.has(key)) add(nestedValue, `${column}.${key}`);
			}
		}
	}
	return [...targets.values()];
}
