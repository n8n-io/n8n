import type {
	IConnection,
	IConnections,
	INode,
	INodeParameters,
	IWorkflowBase,
	NodeConnectionType,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

const positionSchema = z.tuple([z.number(), z.number()]).describe('Canvas position as [x, y]');

const credentialsSchema = z.record(
	z.string(),
	z.object({ id: z.string().nullable(), name: z.string() }),
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
		type: z.literal('addNode'),
		node: z
			.object({
				name: z.string().describe('Unique node name. Must not collide with an existing node.'),
				type: z.string().describe('Fully qualified node type, e.g. "n8n-nodes-base.set".'),
				typeVersion: z.number(),
				parameters: z.record(z.string(), z.unknown()).optional(),
				position: positionSchema.optional(),
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
			.describe('Name of the node to remove. All inbound and outbound connections are removed.'),
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
		position: positionSchema,
	}),
	z.object({
		type: z.literal('setNodeDisabled'),
		nodeName: z.string(),
		disabled: z.boolean(),
	}),
	z.object({
		type: z.literal('setWorkflowMetadata'),
		name: z.string().max(128).optional(),
		description: z.string().max(255).optional(),
	}),
]);

export type PartialUpdateOperation = z.infer<typeof partialUpdateOperationSchema>;

interface WorkflowSlice {
	name: string;
	description?: string;
	nodes: INode[];
	connections: IConnections;
}

export interface ApplyOperationsSuccess {
	success: true;
	workflow: WorkflowSlice;
	addedNodeNames: string[];
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
});

const findNode = (nodes: INode[], name: string): INode | undefined =>
	nodes.find((n) => n.name === name);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = (
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> => {
	const result: Record<string, unknown> = { ...target };
	for (const [key, value] of Object.entries(source)) {
		const existing = result[key];
		if (isPlainObject(existing) && isPlainObject(value)) {
			result[key] = deepMerge(existing, value);
		} else {
			result[key] = value;
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
	const addedNodeNames: string[] = [];

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];

		switch (op.type) {
			case 'updateNodeParameters': {
				const node = findNode(workflow.nodes, op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				const merged = op.replace
					? op.parameters
					: deepMerge((node.parameters ?? {}) as Record<string, unknown>, op.parameters);
				node.parameters = merged as INodeParameters;
				break;
			}

			case 'addNode': {
				if (findNode(workflow.nodes, op.node.name)) {
					return fail(i, `a node named '${op.node.name}' already exists`);
				}
				const node: INode = {
					id: op.node.id ?? uuid(),
					name: op.node.name,
					type: op.node.type,
					typeVersion: op.node.typeVersion,
					position: op.node.position ?? [0, 0],
					parameters: (op.node.parameters ?? {}) as INodeParameters,
				};
				if (op.node.credentials) node.credentials = op.node.credentials;
				if (op.node.disabled !== undefined) node.disabled = op.node.disabled;
				if (op.node.notes !== undefined) node.notes = op.node.notes;
				workflow.nodes.push(node);
				addedNodeNames.push(node.name);
				break;
			}

			case 'removeNode': {
				const idx = workflow.nodes.findIndex((n) => n.name === op.nodeName);
				if (idx === -1) return fail(i, `node '${op.nodeName}' not found`);
				workflow.nodes.splice(idx, 1);
				removeConnectionsFor(workflow.connections, op.nodeName);
				const addedIdx = addedNodeNames.indexOf(op.nodeName);
				if (addedIdx !== -1) addedNodeNames.splice(addedIdx, 1);
				break;
			}

			case 'renameNode': {
				if (op.oldName === op.newName) break;
				const node = findNode(workflow.nodes, op.oldName);
				if (!node) return fail(i, `node '${op.oldName}' not found`);
				if (findNode(workflow.nodes, op.newName)) {
					return fail(i, `a node named '${op.newName}' already exists`);
				}
				node.name = op.newName;
				renameInConnections(workflow.connections, op.oldName, op.newName);
				const addedIdx = addedNodeNames.indexOf(op.oldName);
				if (addedIdx !== -1) addedNodeNames[addedIdx] = op.newName;
				break;
			}

			case 'addConnection': {
				if (!findNode(workflow.nodes, op.source)) {
					return fail(i, `source node '${op.source}' not found`);
				}
				if (!findNode(workflow.nodes, op.target)) {
					return fail(i, `target node '${op.target}' not found`);
				}
				const connectionType = op.connectionType ?? 'main';
				const sourceIndex = op.sourceIndex ?? 0;
				const targetIndex = op.targetIndex ?? 0;
				const typedConnection = connectionType as NodeConnectionType;
				const slot = ensureOutputSlot(
					workflow.connections,
					op.source,
					typedConnection,
					sourceIndex,
				);
				const exists = slot.some(
					(c) => c.node === op.target && c.type === typedConnection && c.index === targetIndex,
				);
				if (!exists) {
					slot.push({ node: op.target, type: typedConnection, index: targetIndex });
				}
				break;
			}

			case 'removeConnection': {
				const connectionType = op.connectionType ?? 'main';
				const sourceIndex = op.sourceIndex ?? 0;
				const targetIndex = op.targetIndex ?? 0;
				const byType = workflow.connections[op.source];
				const outputs = byType?.[connectionType];
				const slot = outputs?.[sourceIndex];
				if (!slot) {
					return fail(i, `no '${connectionType}' connection from '${op.source}'`);
				}
				const before = slot.length;
				const filtered = slot.filter(
					(c) => !(c.node === op.target && c.type === connectionType && c.index === targetIndex),
				);
				if (filtered.length === before) {
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
				const node = findNode(workflow.nodes, op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				node.credentials = {
					...(node.credentials ?? {}),
					[op.credentialKey]: { id: op.credentialId, name: op.credentialName },
				};
				break;
			}

			case 'setNodePosition': {
				const node = findNode(workflow.nodes, op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				node.position = op.position;
				break;
			}

			case 'setNodeDisabled': {
				const node = findNode(workflow.nodes, op.nodeName);
				if (!node) return fail(i, `node '${op.nodeName}' not found`);
				node.disabled = op.disabled;
				break;
			}

			case 'setWorkflowMetadata': {
				if (op.name !== undefined) workflow.name = op.name;
				if (op.description !== undefined) workflow.description = op.description;
				break;
			}
		}
	}

	return { success: true, workflow, addedNodeNames };
}

/**
 * Pick only the fields the partial-update path needs from a workflow entity.
 * Keeps the surface explicit and avoids mutating the loaded entity.
 */
export function toWorkflowSlice(workflow: IWorkflowBase): WorkflowSlice {
	return {
		name: workflow.name ?? '',
		description: (workflow as { description?: string }).description,
		nodes: workflow.nodes,
		connections: workflow.connections,
	};
}
