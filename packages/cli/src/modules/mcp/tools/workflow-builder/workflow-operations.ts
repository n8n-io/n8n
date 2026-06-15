import type {
	IConnection,
	IConnections,
	INode,
	INodeParameters,
	IWorkflowBase,
	NodeConnectionType,
} from 'n8n-workflow';
import { isSafeObjectProperty, NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

const positionSchema = () =>
	z
		.array(z.number())
		.length(2)
		.transform((v): [number, number] => [v[0], v[1]])
		.describe('Canvas position as [x, y]');

const credentialsSchema = z.record(
	z.string(),
	z.object({ id: z.string().optional(), name: z.string() }),
);

export const partialUpdateOperationSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('updateNodeParameters'),
		nodeName: z.string().describe('Name of the existing node to update.'),
		parameters: z
			.record(z.string(), z.unknown())
			.describe('Parameter object to merge into (or replace) the node parameters.'),
		replace: z
			.boolean()
			.optional()
			.describe(
				'If true, replace the node parameters entirely with `parameters`. If false or omitted, deep-merge `parameters` into the existing parameters.',
			),
	}),
	z.object({
		type: z.literal('setNodeParameter'),
		nodeName: z.string().describe('Name of the existing node to update.'),
		path: z
			.string()
			.min(2)
			.describe(
				'JSON Pointer (RFC 6901) path to the parameter to set, e.g. "/jsonSchema" or "/options/systemMessage". Must start with "/". Intermediate objects are created on demand. Array indices are NOT supported — to change a value inside an array, set the whole array. Use this instead of `updateNodeParameters` when you only need to set one nested key — the payload stays small regardless of the rest of the parameters object.',
			),
		value: z
			.unknown()
			.refine((v) => v !== undefined, { message: 'value is required' })
			.describe('Value to set at the path. Any defined JSON value.'),
	}),
	z.object({
		type: z.literal('addNode'),
		node: z
			.object({
				name: z.string().describe('Unique node name. Must not collide with an existing node.'),
				type: z.string().describe('Fully qualified node type, e.g. "n8n-nodes-base.set".'),
				typeVersion: z.number(),
				parameters: z.record(z.string(), z.unknown()).optional(),
				position: positionSchema().optional(),
				credentials: credentialsSchema.optional(),
				disabled: z.boolean().optional(),
				notes: z.string().optional(),
				id: z.string().optional().describe('Optional node id. Generated if omitted.'),
			})
			.describe('The node to add to the workflow.'),
	}),
	z.object({
		type: z.literal('removeNode'),
		nodeName: z
			.string()
			.describe(
				'Name of the node to remove. All inbound and outbound connections are removed, including any sub-node attachments (LLM models, memory, tools) — the sub-nodes themselves remain in the workflow but become disconnected and will not be re-attached automatically. To modify a node, use updateNodeParameters or setNodeParameter instead.',
			),
	}),
	z.object({
		type: z.literal('renameNode'),
		oldName: z.string(),
		newName: z.string().describe('New unique node name.'),
	}),
	z.object({
		type: z.literal('addConnection'),
		source: z.string().describe('Name of the source node.'),
		target: z.string().describe('Name of the target node.'),
		sourceIndex: z
			.number()
			.int()
			.nonnegative()
			.optional()
			.describe('Source output index. Default 0.'),
		targetIndex: z
			.number()
			.int()
			.nonnegative()
			.optional()
			.describe('Target input index. Default 0.'),
		connectionType: z
			.string()
			.optional()
			.describe('Connection type, e.g. "main" or "ai_languageModel". Default "main".'),
	}),
	z.object({
		type: z.literal('removeConnection'),
		source: z.string(),
		target: z.string(),
		sourceIndex: z.number().int().nonnegative().optional(),
		targetIndex: z.number().int().nonnegative().optional(),
		connectionType: z.string().optional(),
	}),
	z.object({
		type: z.literal('setNodeCredential'),
		nodeName: z.string(),
		credentialKey: z
			.string()
			.describe('Credential key on the node, e.g. "slackApi" or "httpHeaderAuth".'),
		credentialId: z.string(),
		credentialName: z.string(),
	}),
	z.object({
		type: z.literal('setNodePosition'),
		nodeName: z.string(),
		position: positionSchema(),
	}),
	z.object({
		type: z.literal('setNodeDisabled'),
		nodeName: z.string(),
		disabled: z.boolean(),
	}),
	z.object({
		type: z.literal('setNodeSettings'),
		nodeName: z.string().describe('Name of the existing node to update.'),
		settings: z
			.object({
				onError: z
					.enum(['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'])
					.optional()
					.describe(
						'How the node behaves on error. "stopWorkflow" halts the run; "continueRegularOutput" forwards an empty item on the main output; "continueErrorOutput" routes the failure to the node\'s error output. Required for sub-nodes (LLM model, memory, tools) since the canvas UI does not expose this setting for them.',
					),
				retryOnFail: z.boolean().optional(),
				maxTries: z
					.number()
					.int()
					.min(2)
					.max(5)
					.optional()
					.describe('Number of attempts when retryOnFail is true (2–5).'),
				waitBetweenTries: z
					.number()
					.int()
					.min(0)
					.max(5000)
					.optional()
					.describe('Milliseconds to wait between retry attempts (0–5000).'),
				alwaysOutputData: z.boolean().optional(),
				executeOnce: z.boolean().optional(),
			})
			.refine((s) => Object.keys(s).length > 0, {
				message: 'settings must specify at least one field',
			})
			.describe(
				'Node-level execution settings. Only the keys you include are written; omitted keys are left unchanged.',
			),
	}),
	z.object({
		type: z.literal('setWorkflowMetadata'),
		name: z.string().max(128).optional(),
		description: z.string().max(255).optional(),
	}),
	z.object({
		type: z.literal('addTags'),
		names: z
			.array(z.string().trim().min(1).max(24))
			.min(1)
			.max(50)
			.describe('Tag names to attach. Unknown names are auto-created. Idempotent.'),
	}),
	z.object({
		type: z.literal('removeTags'),
		names: z
			.array(z.string().trim().min(1).max(24))
			.min(1)
			.max(50)
			.describe('Tag names to detach from the workflow. Unknown names are ignored.'),
	}),
]);

export type PartialUpdateOperation = z.infer<typeof partialUpdateOperationSchema>;

interface WorkflowSlice {
	name: string;
	description?: string;
	nodes: INode[];
	connections: IConnections;
	/** Existing tag names on the workflow. Undefined when not loaded; tag ops require this. */
	tagNames?: string[];
}

export interface ApplyOperationsSuccess {
	success: true;
	workflow: WorkflowSlice;
	addedNodeNames: string[];
	/** Final tag set after applying tag ops. Undefined means "leave unchanged". */
	tagNames?: string[];
}

export interface ApplyOperationsFailure {
	success: false;
	error: string;
	opIndex: number;
}

export type ApplyOperationsResult = ApplyOperationsSuccess | ApplyOperationsFailure;

const cloneWorkflow = (workflow: WorkflowSlice): WorkflowSlice => ({
	name: workflow.name,
	description: workflow.description,
	nodes: workflow.nodes.map((node) => structuredClone(node)),
	connections: structuredClone(workflow.connections),
	tagNames: workflow.tagNames ? [...workflow.tagNames] : undefined,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeUnsafeKeys = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(sanitizeUnsafeKeys);
	if (!isPlainObject(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, v] of Object.entries(value)) {
		if (!isSafeObjectProperty(key)) continue;
		out[key] = sanitizeUnsafeKeys(v);
	}
	return out;
};

/**
 * Decode a JSON Pointer path (RFC 6901) into safe property segments.
 * Returns null if the path is malformed, empty, contains an empty segment,
 * or contains an unsafe segment. The leading "/" is required.
 * Array indices are not supported: numeric segments are treated as object keys,
 * and descent into an array (or any non-object) fails at apply time.
 */
const parseJsonPointer = (path: string): string[] | null => {
	if (!path.startsWith('/')) return null;
	const tail = path.slice(1);
	if (tail.length === 0) return null;
	const rawSegments = tail.split('/');
	const segments: string[] = [];
	for (const raw of rawSegments) {
		// RFC 6901: every '~' must be followed by '0' or '1'. Bare '~' or '~2' is malformed.
		if (/~(?:[^01]|$)/.test(raw)) return null;
		const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
		if (seg.length === 0 || !isSafeObjectProperty(seg)) return null;
		segments.push(seg);
	}
	return segments;
};

/**
 * Set `value` at `segments` inside `root`, creating intermediate objects on demand.
 * Returns an error message if an intermediate segment exists but is not a plain object,
 * otherwise mutates `root` in place and returns null.
 */
const setAtPointer = (
	root: Record<string, unknown>,
	segments: string[],
	value: unknown,
): string | null => {
	let cursor: Record<string, unknown> = root;
	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i];
		const next = cursor[key];
		if (next === undefined) {
			const child: Record<string, unknown> = {};
			cursor[key] = child;
			cursor = child;
		} else if (isPlainObject(next)) {
			cursor = next;
		} else {
			return `cannot descend into non-object at '/${segments.slice(0, i + 1).join('/')}'`;
		}
	}
	cursor[segments[segments.length - 1]] = sanitizeUnsafeKeys(value);
	return null;
};

const deepMerge = (
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = { ...target };
	for (const [key, value] of Object.entries(source)) {
		if (!isSafeObjectProperty(key)) continue;
		const existing = Object.prototype.hasOwnProperty.call(result, key) ? result[key] : undefined;
		if (isPlainObject(existing) && isPlainObject(value)) {
			result[key] = deepMerge(existing, value);
		} else {
			result[key] = sanitizeUnsafeKeys(value);
		}
	}
	return result;
};

/**
 * Drop every inbound and outbound connection that references `nodeName`,
 * pruning empty arrays/objects so the JSON shape stays clean.
 */
const removeConnectionsFor = (connections: IConnections, nodeName: string): void => {
	delete connections[nodeName];

	for (const sourceName of Object.keys(connections)) {
		const byType = connections[sourceName];
		for (const connectionType of Object.keys(byType)) {
			const outputs = byType[connectionType];
			for (let i = 0; i < outputs.length; i++) {
				const targets = outputs[i];
				if (!targets) continue;
				outputs[i] = targets.filter((c) => c.node !== nodeName);
			}
			if (outputs.every((o) => !o || o.length === 0)) {
				delete byType[connectionType];
			}
		}
		if (Object.keys(byType).length === 0) {
			delete connections[sourceName];
		}
	}
};

/**
 * Rename every reference to `oldName` (both as connection key and as target).
 */
const renameInConnections = (connections: IConnections, oldName: string, newName: string): void => {
	if (connections[oldName]) {
		connections[newName] = connections[oldName];
		delete connections[oldName];
	}

	for (const sourceName of Object.keys(connections)) {
		const byType = connections[sourceName];
		for (const connectionType of Object.keys(byType)) {
			const outputs = byType[connectionType];
			for (const targets of outputs) {
				if (!targets) continue;
				for (const conn of targets) {
					if (conn.node === oldName) conn.node = newName;
				}
			}
		}
	}
};

const ensureOutputSlot = (
	connections: IConnections,
	source: string,
	connectionType: string,
	sourceIndex: number,
): IConnection[] => {
	const byType = (connections[source] ??= {});
	const outputs = (byType[connectionType] ??= []);
	while (outputs.length <= sourceIndex) outputs.push(null);
	const slot = outputs[sourceIndex] ?? [];
	outputs[sourceIndex] = slot;
	return slot;
};

const pruneConnectionShape = (
	connections: IConnections,
	source: string,
	connectionType: string,
): void => {
	const byType = connections[source];
	if (!byType) return;
	const outputs = byType[connectionType];
	if (outputs && outputs.every((o) => !o || o.length === 0)) {
		delete byType[connectionType];
	}
	if (Object.keys(byType).length === 0) {
		delete connections[source];
	}
};

const fail = (opIndex: number, message: string): ApplyOperationsFailure => ({
	success: false,
	error: `Operation ${opIndex} failed: ${message}`,
	opIndex,
});

/**
 * Apply a sequence of partial-update operations to a workflow slice atomically.
 * Returns the mutated clone on success, or the first failure with the offending op index.
 *
 * The function never mutates the input.
 */
export function applyOperations(
	input: WorkflowSlice,
	operations: PartialUpdateOperation[],
): ApplyOperationsResult {
	const workflow = cloneWorkflow(input);
	const nodeByName = new Map(workflow.nodes.map((n) => [n.name, n]));
	const addedNodeNames = new Set<string>();
	// Tag set is null until the first tag op runs; that keeps "no tag ops"
	// distinguishable from "tag ops applied to an empty set" at return time.
	let tagSet: Set<string> | null = null;

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];

		switch (op.type) {
			case 'updateNodeParameters': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				const sanitized = sanitizeUnsafeKeys(op.parameters) as Record<string, unknown>;
				const merged = op.replace
					? sanitized
					: deepMerge((node.parameters ?? {}) as Record<string, unknown>, sanitized);
				node.parameters = merged as INodeParameters;
				break;
			}

			case 'setNodeParameter': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				const segments = parseJsonPointer(op.path);
				if (!segments) {
					return fail(i, `path '${op.path}' is invalid or contains unsafe segments`);
				}
				const params = (node.parameters ?? {}) as Record<string, unknown>;
				const setError = setAtPointer(params, segments, op.value);
				if (setError) return fail(i, setError);
				node.parameters = params as INodeParameters;
				break;
			}

			case 'addNode': {
				if (!isSafeObjectProperty(op.node.name)) {
					return fail(i, `node name '${op.node.name}' is not allowed`);
				}
				if (nodeByName.has(op.node.name)) {
					return fail(i, `a node named '${op.node.name}' already exists`);
				}
				const node: INode = {
					id: op.node.id ?? uuid(),
					name: op.node.name,
					type: op.node.type,
					typeVersion: op.node.typeVersion,
					position: op.node.position ?? [0, 0],
					parameters: (sanitizeUnsafeKeys(op.node.parameters ?? {}) ?? {}) as INodeParameters,
				};
				if (op.node.credentials) {
					const credentialEntries: Array<[string, { id: string | null; name: string }]> = [];
					for (const [key, cred] of Object.entries(op.node.credentials)) {
						if (!isSafeObjectProperty(key)) {
							return fail(i, `credential key '${key}' is not allowed`);
						}
						credentialEntries.push([key, { id: cred.id ?? null, name: cred.name }]);
					}
					node.credentials = Object.fromEntries(credentialEntries);
				}
				if (op.node.disabled !== undefined) node.disabled = op.node.disabled;
				if (op.node.notes !== undefined) node.notes = op.node.notes;
				workflow.nodes.push(node);
				nodeByName.set(node.name, node);
				addedNodeNames.add(node.name);
				break;
			}

			case 'removeNode': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				workflow.nodes.splice(workflow.nodes.indexOf(node), 1);
				nodeByName.delete(op.nodeName);
				removeConnectionsFor(workflow.connections, op.nodeName);
				addedNodeNames.delete(op.nodeName);
				break;
			}

			case 'renameNode': {
				if (op.oldName === op.newName) break;
				if (!isSafeObjectProperty(op.newName)) {
					return fail(i, `node name '${op.newName}' is not allowed`);
				}
				const node = nodeByName.get(op.oldName);
				if (!node) return fail(i, `node '${op.oldName}' not found`);
				if (nodeByName.has(op.newName)) {
					return fail(i, `a node named '${op.newName}' already exists`);
				}
				node.name = op.newName;
				nodeByName.delete(op.oldName);
				nodeByName.set(op.newName, node);
				renameInConnections(workflow.connections, op.oldName, op.newName);
				if (addedNodeNames.delete(op.oldName)) addedNodeNames.add(op.newName);
				break;
			}

			case 'addConnection': {
				if (!nodeByName.has(op.source)) {
					return fail(i, `source node '${op.source}' not found`);
				}
				if (!nodeByName.has(op.target)) {
					return fail(i, `target node '${op.target}' not found`);
				}
				const connectionType = (op.connectionType ??
					NodeConnectionTypes.Main) as NodeConnectionType;
				if (!isSafeObjectProperty(op.source) || !isSafeObjectProperty(connectionType)) {
					return fail(i, 'connection name is not allowed');
				}
				const sourceIndex = op.sourceIndex ?? 0;
				const targetIndex = op.targetIndex ?? 0;
				const slot = ensureOutputSlot(workflow.connections, op.source, connectionType, sourceIndex);
				const exists = slot.some(
					(c) => c.node === op.target && c.type === connectionType && c.index === targetIndex,
				);
				if (!exists) {
					slot.push({ node: op.target, type: connectionType, index: targetIndex });
				}
				break;
			}

			case 'removeConnection': {
				const connectionType = (op.connectionType ??
					NodeConnectionTypes.Main) as NodeConnectionType;
				const sourceIndex = op.sourceIndex ?? 0;
				const targetIndex = op.targetIndex ?? 0;
				const byType = workflow.connections[op.source];
				const outputs = byType?.[connectionType];
				const slot = outputs?.[sourceIndex];
				if (!slot) {
					return fail(i, `no '${connectionType}' connection from '${op.source}'`);
				}
				const filtered = slot.filter(
					(c) => !(c.node === op.target && c.type === connectionType && c.index === targetIndex),
				);
				if (filtered.length === slot.length) {
					return fail(
						i,
						`connection from '${op.source}'[${sourceIndex}] to '${op.target}'[${targetIndex}] does not exist`,
					);
				}
				outputs[sourceIndex] = filtered;
				pruneConnectionShape(workflow.connections, op.source, connectionType);
				break;
			}

			case 'setNodeCredential': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				if (!isSafeObjectProperty(op.credentialKey)) {
					return fail(i, `credential key '${op.credentialKey}' is not allowed`);
				}
				node.credentials = {
					...(node.credentials ?? {}),
					[op.credentialKey]: { id: op.credentialId, name: op.credentialName },
				};
				break;
			}

			case 'setNodePosition': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				node.position = op.position;
				break;
			}

			case 'setNodeDisabled': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				node.disabled = op.disabled;
				break;
			}

			case 'setNodeSettings': {
				const node = nodeByName.get(op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				const s = op.settings;
				if (s.onError !== undefined) node.onError = s.onError;
				if (s.retryOnFail !== undefined) node.retryOnFail = s.retryOnFail;
				if (s.maxTries !== undefined) node.maxTries = s.maxTries;
				if (s.waitBetweenTries !== undefined) node.waitBetweenTries = s.waitBetweenTries;
				if (s.alwaysOutputData !== undefined) node.alwaysOutputData = s.alwaysOutputData;
				if (s.executeOnce !== undefined) node.executeOnce = s.executeOnce;
				break;
			}

			case 'setWorkflowMetadata': {
				if (op.name !== undefined) workflow.name = op.name;
				if (op.description !== undefined) workflow.description = op.description;
				break;
			}

			case 'addTags':
			case 'removeTags': {
				if (workflow.tagNames === undefined) {
					return fail(i, 'tag operations require existing tags to be loaded');
				}
				if (tagSet === null) tagSet = new Set(workflow.tagNames);
				if (op.type === 'addTags') {
					for (const name of op.names) tagSet.add(name);
				} else {
					for (const name of op.names) tagSet.delete(name);
				}
				break;
			}

			default: {
				op satisfies never;
				return fail(i, 'unknown operation type');
			}
		}
	}

	if (tagSet !== null) {
		workflow.tagNames = [...tagSet];
	}

	return {
		success: true,
		workflow,
		addedNodeNames: [...addedNodeNames],
		tagNames: tagSet !== null ? [...tagSet] : undefined,
	};
}

/**
 * Pick only the fields the partial-update path needs from a workflow entity.
 * Keeps the surface explicit and avoids mutating the loaded entity.
 */
export function toWorkflowSlice(
	workflow: IWorkflowBase,
	options: { includeTags?: boolean } = {},
): WorkflowSlice {
	let tagNames: string[] | undefined;
	if (options.includeTags) {
		const tags = (workflow as { tags?: Array<{ name: string }> }).tags;
		if (tags === undefined) {
			throw new Error('toWorkflowSlice: includeTags=true requires the tags relation to be loaded.');
		}
		tagNames = tags.map((t) => t.name);
	}
	return {
		name: workflow.name ?? '',
		description: (workflow as { description?: string }).description,
		nodes: workflow.nodes,
		connections: workflow.connections,
		tagNames,
	};
}
