export type WorkflowUiNodePayload = {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	resource?: string;
	operation?: string;
	action?: string;
	subtitle?: string;
	parameters: Record<string, unknown>;
};

export type WorkflowUiPayload = {
	name: string;
	nodes: WorkflowUiNodePayload[];
	connections: unknown;
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

export function buildWorkflowUiPayload(workflow: {
	name: string;
	nodes: Array<Record<string, unknown>>;
	connections: unknown;
}): WorkflowUiPayload {
	return {
		name: workflow.name,
		nodes: workflow.nodes.map((node) => {
			const parameters = copyParameters(node.parameters);
			const resource = readString(parameters.resource);
			const operation = readString(parameters.operation);

			return {
				id: readString(node.id) ?? '',
				name: readString(node.name) ?? '',
				type: readString(node.type) ?? '',
				typeVersion: typeof node.typeVersion === 'number' ? node.typeVersion : 1,
				...(resource === undefined ? {} : { resource }),
				...(operation === undefined ? {} : { operation }),
				parameters,
			};
		}),
		connections: workflow.connections,
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
