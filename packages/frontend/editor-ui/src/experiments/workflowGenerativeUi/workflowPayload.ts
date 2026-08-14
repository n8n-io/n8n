export type WorkflowUiNodeContent = {
	model?: string;
	prompt?: string;
	tools?: string[];
	message?: string;
	command?: string;
	url?: string;
	path?: string;
	query?: string;
	conditions?: string[];
};

export type WorkflowUiNodePayload = {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	action?: string;
	subtitle?: string;
	content?: WorkflowUiNodeContent;
	parameters: Record<string, unknown>;
};

export type WorkflowUiConnection = {
	sourceNodeId: string;
	targetNodeId: string;
	type: string;
	outputIndex: number;
	inputIndex: number;
};

export type WorkflowUiPayload = {
	name: string;
	nodes: WorkflowUiNodePayload[];
	connections: WorkflowUiConnection[];
};

const CONTENT_LIMIT = 300;
const MAX_DEPTH = 6;

type ScalarContentField = 'model' | 'prompt' | 'command' | 'url' | 'path' | 'query' | 'message';

const CONTENT_KEY_FIELDS: Record<string, ScalarContentField> = {
	model: 'model',
	modelId: 'model',
	modelName: 'model',
	deploymentName: 'model',
	systemMessage: 'prompt',
	system: 'prompt',
	prompt: 'prompt',
	command: 'command',
	script: 'command',
	url: 'url',
	endpoint: 'url',
	path: 'path',
	remotePath: 'path',
	filePath: 'path',
	query: 'query',
	sqlQuery: 'query',
	sql: 'query',
	text: 'message',
	message: 'message',
	body: 'message',
	html: 'message',
};

const OPERATION_WORDS: Record<string, string> = {
	equals: 'is',
	notEquals: 'is not',
	contains: 'contains',
	notContains: 'does not contain',
	startsWith: 'starts with',
	notStartsWith: 'does not start with',
	endsWith: 'ends with',
	notEndsWith: 'does not end with',
	larger: 'is greater than',
	largerEqual: 'is greater than or equal to',
	smaller: 'is less than',
	smallerEqual: 'is less than or equal to',
	after: 'is after',
	before: 'is before',
	regex: 'matches',
	notRegex: 'does not match',
	isEmpty: 'is empty',
	isNotEmpty: 'is not empty',
	isTrue: 'is true',
	isFalse: 'is false',
	exists: 'exists',
	notExists: 'does not exist',
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function copyParameters(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) return {};

	const parameters: Record<string, unknown> = {};
	for (const [key, parameter] of Object.entries(value)) {
		if (key === 'credentials') continue;
		parameters[key] =
			typeof parameter === 'string' && parameter.length > 2000
				? parameter.slice(0, 2000)
				: parameter;
	}
	return parameters;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function truncate(value: string): string {
	return value.length > CONTENT_LIMIT ? value.slice(0, CONTENT_LIMIT) : value;
}

function resolveScalar(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	if (isRecord(value) && typeof value.value === 'string') {
		const trimmed = value.value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	return undefined;
}

function stripExpression(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const withoutPrefix = value.startsWith('=') ? value.slice(1) : value;
	const trimmed = withoutPrefix.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function toToolName(value: unknown): string | undefined {
	if (typeof value === 'string') return resolveScalar(value);
	if (isRecord(value)) return readString(value.name) ?? readString(value.type);
	return undefined;
}

function conditionText(condition: unknown): string | undefined {
	if (!isRecord(condition)) return undefined;
	const left = stripExpression(resolveScalar(condition.leftValue));
	const operator = isRecord(condition.operator) ? condition.operator : {};
	const operation = readString(operator.operation) ?? readString(operator.type);
	const right = stripExpression(resolveScalar(condition.rightValue));
	const operationText = operation ? (OPERATION_WORDS[operation] ?? operation) : undefined;
	const parts = [left, operationText, right].filter(
		(part): part is string => typeof part === 'string' && part.length > 0,
	);
	if (parts.length === 0) return undefined;
	return truncate(parts.join(' '));
}

function collectConditions(value: unknown, into: string[]): void {
	if (!isRecord(value) || !Array.isArray(value.conditions)) return;
	for (const entry of value.conditions) {
		const text = conditionText(entry);
		if (text) into.push(text);
	}
}

function extractContent(parameters: Record<string, unknown>): WorkflowUiNodeContent | undefined {
	const content: WorkflowUiNodeContent = {};
	const tools: string[] = [];
	const conditions: string[] = [];

	const visit = (value: unknown, depth: number): void => {
		if (depth > MAX_DEPTH) return;
		if (Array.isArray(value)) {
			for (const entry of value) visit(entry, depth + 1);
			return;
		}
		if (!isRecord(value)) return;

		for (const [key, entry] of Object.entries(value)) {
			if (key === 'credentials') continue;

			if (key === 'conditions') collectConditions(entry, conditions);
			if (key === 'tools' && Array.isArray(entry)) {
				for (const tool of entry) {
					const name = toToolName(tool);
					if (name && !tools.includes(name)) tools.push(name);
				}
			}

			const field = CONTENT_KEY_FIELDS[key];
			if (field && content[field] === undefined) {
				const scalar = resolveScalar(entry);
				if (scalar) content[field] = truncate(scalar);
			}

			visit(entry, depth + 1);
		}
	};

	visit(parameters, 0);

	if (tools.length > 0) content.tools = tools;
	if (conditions.length > 0) content.conditions = conditions;

	return Object.keys(content).length > 0 ? content : undefined;
}

function stableSerialize(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
			.join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

function normalizeConnections(
	connections: unknown,
	nodes: WorkflowUiNodePayload[],
): WorkflowUiConnection[] {
	if (!isRecord(connections)) return [];

	const nodeIdByName = new Map(
		nodes
			.filter((node) => node.id.length > 0 && node.name.length > 0)
			.map((node) => [node.name, node.id]),
	);
	const normalized: WorkflowUiConnection[] = [];

	for (const [sourceNodeName, connectionTypes] of Object.entries(connections)) {
		const sourceNodeId = nodeIdByName.get(sourceNodeName);
		if (!sourceNodeId || !isRecord(connectionTypes)) continue;

		for (const outputs of Object.values(connectionTypes)) {
			if (!Array.isArray(outputs)) continue;

			outputs.forEach((targets, outputIndex) => {
				if (!Array.isArray(targets)) return;

				for (const target of targets) {
					if (
						!isRecord(target) ||
						typeof target.node !== 'string' ||
						typeof target.type !== 'string' ||
						target.type.length === 0 ||
						!Number.isInteger(target.index) ||
						typeof target.index !== 'number' ||
						target.index < 0
					) {
						continue;
					}

					const targetNodeId = nodeIdByName.get(target.node);
					if (!targetNodeId) continue;

					normalized.push({
						sourceNodeId,
						targetNodeId,
						type: target.type,
						outputIndex,
						inputIndex: target.index,
					});
				}
			});
		}
	}

	return normalized.sort(
		(left, right) =>
			left.sourceNodeId.localeCompare(right.sourceNodeId) ||
			left.type.localeCompare(right.type) ||
			left.outputIndex - right.outputIndex ||
			left.inputIndex - right.inputIndex ||
			left.targetNodeId.localeCompare(right.targetNodeId),
	);
}

export function buildWorkflowUiPayload(workflow: {
	name: string;
	nodes: Array<Record<string, unknown>>;
	connections: unknown;
}): WorkflowUiPayload {
	const nodes = workflow.nodes.map((node) => {
		const parameters = copyParameters(node.parameters);
		const resource = readString(parameters.resource);
		const operation = readString(parameters.operation);
		const action = readString(node.action) ?? readString(parameters.action);
		const subtitle = readString(node.subtitle);
		const content = extractContent(parameters);

		return {
			id: readString(node.id) ?? '',
			name: readString(node.name) ?? '',
			type: readString(node.type) ?? '',
			typeVersion: typeof node.typeVersion === 'number' ? node.typeVersion : 1,
			...(resource === undefined ? {} : { resource }),
			...(operation === undefined ? {} : { operation }),
			...(action === undefined ? {} : { action }),
			...(subtitle === undefined ? {} : { subtitle }),
			...(content === undefined ? {} : { content }),
			parameters,
		};
	});

	return {
		name: workflow.name,
		nodes,
		connections: normalizeConnections(workflow.connections, nodes),
	};
}

export function hashWorkflowUiPayload(payload: WorkflowUiPayload): string {
	const serialized = stableSerialize(payload);
	let hash = 2166136261;

	for (let index = 0; index < serialized.length; index++) {
		hash ^= serialized.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(16).padStart(8, '0');
}
