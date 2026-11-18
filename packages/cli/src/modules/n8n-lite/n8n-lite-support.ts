import { isRecord } from '@n8n/utils/is-record';
import type { IConnections, INode, INodeParameters } from 'n8n-workflow';

export interface UnsupportedReason {
	node: string;
	reason: string;
}

const STICKY_NOTE = 'n8n-nodes-base.stickyNote';
const TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.manualTrigger',
]);

const SUPPORTED_VERSIONS: Record<string, number[]> = {
	'n8n-nodes-base.webhook': [2, 2.1, 2.2],
	'n8n-nodes-base.set': [3.3, 3.4, 3.5],
	'n8n-nodes-base.if': [2, 2.1, 2.2, 2.3, 2.4],
	'n8n-nodes-base.respondToWebhook': [1.1, 1.2, 1.3, 1.4, 1.5],
	'n8n-nodes-base.httpRequest': [4.2, 4.3, 4.4, 4.5],
	'n8n-nodes-base.scheduleTrigger': [1.2, 1.3, 1.4],
	'n8n-nodes-base.manualTrigger': [1],
};

const IF_OPERATIONS = new Map<string, string[]>([
	[
		'string',
		[
			'equals',
			'notEquals',
			'contains',
			'startsWith',
			'endsWith',
			'exists',
			'notExists',
			'empty',
			'notEmpty',
		],
	],
	['number', ['equals', 'gt', 'gte', 'lt', 'lte']],
	['boolean', ['true', 'false']],
]);

// e.g. `$json.a.b` or `$json["a"]`
const JSON_PATH = /^\s*\$json(\.[A-Za-z_$][\w$]*|\[\s*("[^"]*"|'[^']*'|\d+)\s*\])*\s*$/;
const EXPRESSION_BLOCK = /\{\{([\s\S]*?)\}\}/g;

function asRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function unsupportedExpressions(value: unknown): string[] {
	if (typeof value === 'string') {
		if (!value.startsWith('=')) return [];
		const bodies = [...value.matchAll(EXPRESSION_BLOCK)].map((match) => match[1]);
		return bodies.filter((body) => !JSON_PATH.test(body)).map((body) => `{{${body}}}`);
	}
	if (Array.isArray(value)) return value.flatMap(unsupportedExpressions);
	if (isRecord(value)) return Object.values(value).flatMap(unsupportedExpressions);
	return [];
}

function onlyAllowedKeys(options: unknown, allowed: string[]): string[] {
	return Object.keys(asRecord(options)).filter((key) => !allowed.includes(key));
}

function checkWebhook(parameters: INodeParameters): string[] {
	const reasons: string[] = [];
	if (parameters.multipleMethods === true) reasons.push('multiple HTTP methods are not supported');
	if (parameters.authentication !== 'none') reasons.push('webhook authentication is not supported');
	if (parameters.responseMode !== 'onReceived' && parameters.responseMode !== 'responseNode') {
		reasons.push(`response mode "${String(parameters.responseMode)}" is not supported`);
	}
	for (const key of onlyAllowedKeys(parameters.options, ['responseCode', 'allowedOrigins'])) {
		reasons.push(`option "${key}" is not supported`);
	}
	return reasons;
}

function checkSet(parameters: INodeParameters): string[] {
	const reasons: string[] = [];
	if (parameters.mode !== 'manual') reasons.push('only manual mapping mode is supported');
	if (parameters.duplicateItem === true) reasons.push('"Duplicate item" is not supported');
	if (parameters.includeOtherFields === true && parameters.include !== 'all') {
		reasons.push('only "include all other fields" is supported');
	}
	for (const key of onlyAllowedKeys(parameters.options, [
		'dotNotation',
		'ignoreConversionErrors',
	])) {
		reasons.push(`option "${key}" is not supported`);
	}
	const assignments = asRecord(parameters.assignments).assignments;
	for (const assignment of Array.isArray(assignments) ? assignments : []) {
		const type = asRecord(assignment).type;
		if (!['string', 'number', 'boolean', 'object'].includes(String(type))) {
			reasons.push(`field type "${String(type)}" is not supported`);
		}
	}
	return reasons;
}

function checkIf(parameters: INodeParameters): string[] {
	const reasons: string[] = [];
	if (parameters.looseTypeValidation === true) {
		reasons.push('loose type validation is not supported');
	}
	const filter = asRecord(parameters.conditions);
	if (filter.combinator !== 'and' && filter.combinator !== 'or') {
		reasons.push(`combinator "${String(filter.combinator)}" is not supported`);
	}
	if (asRecord(filter.options).typeValidation === 'loose') {
		reasons.push('loose type validation is not supported');
	}
	const conditions = Array.isArray(filter.conditions) ? filter.conditions : [];
	for (const condition of conditions) {
		const operator = asRecord(asRecord(condition).operator);
		const type = String(operator.type);
		const operation = String(operator.operation);
		if (!IF_OPERATIONS.get(type)?.includes(operation)) {
			reasons.push(`condition "${type} ${operation}" is not supported`);
		}
	}
	return reasons;
}

function checkRespondToWebhook(parameters: INodeParameters): string[] {
	const reasons: string[] = [];
	const supported = ['firstIncomingItem', 'allIncomingItems', 'json', 'text', 'noData'];
	if (!supported.includes(String(parameters.respondWith))) {
		reasons.push(`responding with "${String(parameters.respondWith)}" is not supported`);
	}
	for (const key of onlyAllowedKeys(parameters.options, ['responseCode', 'responseHeaders'])) {
		reasons.push(`option "${key}" is not supported`);
	}
	return reasons;
}

function checkHttpRequest(parameters: INodeParameters): string[] {
	const reasons: string[] = [];
	if (parameters.authentication !== 'none') reasons.push('authentication is not supported');
	if (parameters.sendBody === true && parameters.contentType !== 'json') {
		reasons.push(`body content type "${String(parameters.contentType)}" is not supported`);
	}
	for (const key of onlyAllowedKeys(parameters.options, ['timeout'])) {
		reasons.push(`option "${key}" is not supported`);
	}
	return reasons;
}

function checkScheduleTrigger(parameters: INodeParameters): string[] {
	const intervals = asRecord(parameters.rule).interval;
	return (Array.isArray(intervals) ? intervals : [])
		.map((interval) => String(asRecord(interval).field ?? 'days'))
		.filter((field) => !['seconds', 'minutes', 'hours'].includes(field))
		.map((field) => `schedule interval "${field}" is not supported`);
}

const NODE_CHECKS: Record<string, (parameters: INodeParameters) => string[]> = {
	'n8n-nodes-base.webhook': checkWebhook,
	'n8n-nodes-base.set': checkSet,
	'n8n-nodes-base.if': checkIf,
	'n8n-nodes-base.respondToWebhook': checkRespondToWebhook,
	'n8n-nodes-base.httpRequest': checkHttpRequest,
	'n8n-nodes-base.scheduleTrigger': checkScheduleTrigger,
};

function checkNode(node: INode): string[] {
	const versions = SUPPORTED_VERSIONS[node.type];
	if (!versions) return [`node type "${node.type}" is not supported`];
	if (!versions.includes(node.typeVersion)) {
		return [`version ${node.typeVersion} is not supported (supported: ${versions.join(', ')})`];
	}

	const reasons: string[] = [];
	if (node.disabled) reasons.push('disabled nodes are not supported');
	if (node.credentials && Object.keys(node.credentials).length > 0) {
		reasons.push('credentials are not supported');
	}
	reasons.push(...(NODE_CHECKS[node.type]?.(node.parameters) ?? []));
	for (const expression of unsupportedExpressions(node.parameters)) {
		reasons.push(`expression ${expression} is not supported, only $json paths are`);
	}
	return reasons;
}

function nodesWithSeveralParents(connections: IConnections): string[] {
	const parentsByNode = new Map<string, Set<string>>();
	for (const [source, byType] of Object.entries(connections)) {
		for (const outputs of byType.main ?? []) {
			for (const target of outputs ?? []) {
				const parents = parentsByNode.get(target.node) ?? new Set<string>();
				parents.add(source);
				parentsByNode.set(target.node, parents);
			}
		}
	}
	return [...parentsByNode.entries()]
		.filter(([, parents]) => parents.size > 1)
		.map(([node]) => node);
}

export function runnableNodes(nodes: INode[]): INode[] {
	return nodes.filter((node) => node.type !== STICKY_NOTE);
}

/** Expects nodes with default parameter values filled in. */
export function findUnsupported(nodes: INode[], connections: IConnections): UnsupportedReason[] {
	const reasons: UnsupportedReason[] = nodes.flatMap((node) =>
		checkNode(node).map((reason) => ({ node: node.name, reason })),
	);

	const triggers = nodes.filter((node) => TRIGGER_TYPES.has(node.type));
	if (triggers.length !== 1) {
		reasons.push({ node: '(workflow)', reason: 'the workflow needs exactly one trigger node' });
	}

	for (const node of nodesWithSeveralParents(connections)) {
		reasons.push({
			node,
			reason: 'nodes with more than one incoming connection are not supported',
		});
	}

	return reasons;
}
