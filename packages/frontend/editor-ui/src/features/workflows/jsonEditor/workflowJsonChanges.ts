import isEqual from 'lodash/isEqual';
import { isRecord } from '@n8n/utils/is-record';
import type {
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	IPinData,
	IWorkflowSettings,
	Workflow,
} from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import type { CanvasConnection } from '@/features/workflows/canvas/canvas.types';
import { mapLegacyConnectionsToCanvasConnections } from '@/features/workflows/canvas/canvas.utils';

import type { WorkflowJson } from './workflowJson.types';
import { createNodeNameResolver, type NodeNameResolver } from './workflowJsonReferences';

/** Node keys that have no undo command of their own. Apply restores them through a snapshot. */
export const NODE_FIELD_KEYS = [
	'typeVersion',
	'credentials',
	'notes',
	'notesInFlow',
	'retryOnFail',
	'maxTries',
	'waitBetweenTries',
	'alwaysOutputData',
	'executeOnce',
	'onError',
	'continueOnFail',
	'webhookId',
	'color',
] as const;

export type NodeFieldKey = (typeof NODE_FIELD_KEYS)[number];

// The saved form leaves these out when they hold the default
const FIELD_DEFAULTS: Partial<Record<NodeFieldKey | 'disabled', unknown>> = {
	disabled: false,
	notes: '',
	notesInFlow: false,
	retryOnFail: false,
	alwaysOutputData: false,
	executeOnce: false,
	onError: 'stopWorkflow',
	continueOnFail: false,
};

const NEW_NODE_SPACING = 240;

export type NodeUpdate = {
	id: string;
	/** Name after renames */
	name: string;
	/** Full parameters with defaults, set only when they changed */
	parameters?: INodeParameters;
	changedParameterKeys: string[];
	fields: Partial<INode>;
	changedFieldKeys: NodeFieldKey[];
	position?: [number, number];
	disabled?: boolean;
	typeVersion?: { from: number; to: number };
};

export type ConnectionChange = {
	connection: CanvasConnection;
	sourceName: string;
	targetName: string;
	type: string;
	outputIndex: number;
};

export type PinDataChange = {
	id: string;
	name: string;
	action: 'add' | 'update' | 'remove';
	data?: INodeExecutionData[];
};

export type DroppedReference = { section: 'connections' | 'pinData'; name: string };

export type WorkflowJsonApplyPlan = {
	/** The edited JSON with ids and positions filled in and old node names resolved */
	edited: WorkflowJson;
	added: INode[];
	removed: INode[];
	replaced: Array<{ before: INode; after: INode }>;
	renames: Array<{ id: string; from: string; to: string }>;
	updates: NodeUpdate[];
	connectionsToRemove: ConnectionChange[];
	connectionsToAdd: ConnectionChange[];
	pinData: PinDataChange[];
	settings?: { value: IWorkflowSettings; changedKeys: string[] };
	name?: { from: string; to: string };
	droppedReferences: DroppedReference[];
	hasChanges: boolean;
};

export type WorkflowJsonPlanDeps = {
	/** Store nodes, used to map the current connections to node ids */
	currentNodes: INodeUi[];
	currentConnections: IConnections;
	createWorkflowObject: (nodes: INodeUi[], connections: IConnections) => Workflow;
	createId: () => string;
};

const isPosition = (value: unknown): value is [number, number] =>
	Array.isArray(value) &&
	value.length === 2 &&
	typeof value[0] === 'number' &&
	typeof value[1] === 'number';

const isDataObject = (value: unknown): value is IDataObject => isRecord(value);

const withDefault = (key: NodeFieldKey | 'disabled', value: unknown) =>
	value ?? FIELD_DEFAULTS[key];

function copyField<K extends NodeFieldKey>(target: Partial<INode>, source: INode, key: K) {
	target[key] = source[key];
}

/** The given field keys, with `undefined` for missing ones, so restoring them also clears added fields. */
export function pickNodeFields(
	node: INode,
	keys: readonly NodeFieldKey[] = NODE_FIELD_KEYS,
): Partial<INode> {
	const fields: Partial<INode> = {};
	keys.forEach((key) => copyField(fields, node, key));
	return fields;
}

/** Pinned items may be plain objects or `{ json }` items, like in the pin data editor. */
function toExecutionData(items: unknown): INodeExecutionData[] {
	if (!Array.isArray(items)) return [];
	return items
		.filter(isDataObject)
		.map((item) => ({ json: isDataObject(item.json) ? item.json : item }));
}

/** Parameters with defaults, after the renames rewrote expressions the way a canvas rename does. */
function fullParameters(
	nodes: INode[],
	renames: Array<{ id: string; from: string; to: string }>,
	createWorkflowObject: WorkflowJsonPlanDeps['createWorkflowObject'],
): Map<string, INodeParameters> {
	const renamedIds = new Set(renames.map((rename) => rename.id));
	const oldNames = new Set(renames.map((rename) => rename.from));
	// A new node can take a renamed node's old name. The Workflow map is keyed by name, so park it meanwhile
	const parked = nodes.map((node, index) =>
		!renamedIds.has(node.id) && oldNames.has(node.name)
			? { ...node, name: `__workflow_json_parked_${index}__` }
			: node,
	);
	const workflow = createWorkflowObject(parked, {});
	if (new Set(parked.map((node) => node.name)).size === parked.length) {
		const temporary = renames.map((_, index) => `__workflow_json_rename_${index}__`);
		renames.forEach((rename, index) => workflow.renameNode(rename.from, temporary[index]));
		renames.forEach((rename, index) => workflow.renameNode(temporary[index], rename.to));
	}
	return new Map(Object.values(workflow.nodes).map((node) => [node.id, node.parameters]));
}

function resolveConnections(
	connections: IConnections,
	resolve: NodeNameResolver,
	dropped: DroppedReference[],
): IConnections {
	const resolved: IConnections = {};
	Object.entries(connections).forEach(([sourceName, byType]) => {
		const source = resolve(sourceName);
		if (!source) {
			dropped.push({ section: 'connections', name: sourceName });
			return;
		}
		const target = (resolved[source.name] ??= {});
		Object.entries(byType).forEach(([type, outputs]) => {
			const merged = (target[type] ??= []);
			(outputs ?? []).forEach((connectionsOfOutput, outputIndex) => {
				const kept = (connectionsOfOutput ?? [])
					.map((connection): IConnection | undefined => {
						const node = resolve(connection.node);
						if (!node) dropped.push({ section: 'connections', name: connection.node });
						return node ? { ...connection, node: node.name } : undefined;
					})
					.filter((connection) => connection !== undefined);
				merged[outputIndex] = [...(merged[outputIndex] ?? []), ...kept];
			});
		});
	});
	return resolved;
}

function resolvePinData(
	pinData: IPinData,
	resolve: NodeNameResolver,
	dropped: DroppedReference[],
): Map<string, INodeExecutionData[]> {
	const entries = Object.entries(pinData).flatMap(
		([name, items]): Array<[string, INodeExecutionData[]]> => {
			const node = resolve(name);
			if (node?.id) return [[node.id, toExecutionData(items)]];
			dropped.push({ section: 'pinData', name });
			return [];
		},
	);
	return new Map(entries);
}

function connectionChange(
	connection: CanvasConnection,
	nameById: Map<string, string>,
): ConnectionChange {
	return {
		connection,
		sourceName: nameById.get(connection.source) ?? connection.source,
		targetName: nameById.get(connection.target) ?? connection.target,
		type: connection.data?.source.type ?? 'main',
		outputIndex: connection.data?.source.index ?? 0,
	};
}

function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
	return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
		(key) => !isEqual(before[key], after[key]),
	);
}

export function planWorkflowJsonApply(
	current: WorkflowJson,
	editedInput: WorkflowJson,
	deps: WorkflowJsonPlanDeps,
): WorkflowJsonApplyPlan {
	const currentById = new Map(current.nodes.map((node) => [node.id, node]));
	const seenIds = new Set<string>();
	const rightEdge = Math.max(0, ...current.nodes.map((node) => node.position[0]));
	const top = Math.min(0, ...current.nodes.map((node) => node.position[1]));
	let unplaced = 0;

	const nodes: INode[] = editedInput.nodes.map((node) => {
		const id = node.id && !seenIds.has(node.id) ? node.id : deps.createId();
		seenIds.add(id);
		const base = currentById.get(id);
		const position: [number, number] = isPosition(node.position)
			? node.position
			: (base?.position ?? [rightEdge + NEW_NODE_SPACING * ++unplaced, top]);
		return { ...node, id, parameters: node.parameters ?? {}, position };
	});
	const editedById = new Map(nodes.map((node) => [node.id, node]));

	const matched = nodes.filter((node) => currentById.has(node.id));
	const renames = matched
		.map((node) => ({ id: node.id, from: currentById.get(node.id)?.name ?? '', to: node.name }))
		.filter((rename) => rename.from !== rename.to);
	const dropped: DroppedReference[] = [];
	const resolve = createNodeNameResolver(nodes, current.nodes);
	const connections = resolveConnections(editedInput.connections, resolve, dropped);
	const editedPinData = resolvePinData(editedInput.pinData ?? {}, resolve, dropped);

	// Both sides get the same rename rewrite, so a rename alone does not count as a parameter change
	const currentParameters = fullParameters(
		current.nodes.filter((node) => editedById.has(node.id)),
		renames,
		deps.createWorkflowObject,
	);
	const editedParameters = fullParameters(
		nodes.map((node) => {
			const rename = renames.find((r) => r.id === node.id);
			return rename ? { ...node, name: rename.from } : node;
		}),
		renames,
		deps.createWorkflowObject,
	);
	// New nodes are not on the canvas when the canvas renames run, so they get the rewritten parameters here
	const withRenamedParameters = (node: INode): INode => ({
		...node,
		parameters: editedParameters.get(node.id) ?? node.parameters,
	});

	const replaced = matched.flatMap((node) => {
		const before = currentById.get(node.id);
		return before && before.type !== node.type
			? [{ before, after: withRenamedParameters(node) }]
			: [];
	});
	const replacedIds = new Set(replaced.map(({ after }) => after.id));
	const added = nodes.filter((node) => !currentById.has(node.id)).map(withRenamedParameters);
	const removed = current.nodes.filter((node) => !editedById.has(node.id));

	const updates: NodeUpdate[] = matched
		.filter((node) => !replacedIds.has(node.id))
		.flatMap((node): NodeUpdate[] => {
			const before = currentById.get(node.id);
			if (!before) return [];
			const beforeParameters = currentParameters.get(node.id) ?? {};
			// Without a resolved entry the raw JSON has no defaults, which would look like a change
			const afterParameters = editedParameters.get(node.id) ?? beforeParameters;
			const changedParameterKeys = changedKeys(beforeParameters, afterParameters);
			const changedFieldKeys = NODE_FIELD_KEYS.filter(
				(key) => !isEqual(withDefault(key, before[key]), withDefault(key, node[key])),
			);
			const fields: Partial<INode> = {};
			changedFieldKeys.forEach((key) => copyField(fields, node, key));
			const disabledChanged =
				withDefault('disabled', before.disabled) !== withDefault('disabled', node.disabled);
			const moved = !isEqual(before.position, node.position);

			const update: NodeUpdate = {
				id: node.id,
				name: node.name,
				parameters: changedParameterKeys.length > 0 ? afterParameters : undefined,
				changedParameterKeys,
				fields,
				changedFieldKeys,
				position: moved ? node.position : undefined,
				disabled: disabledChanged ? node.disabled === true : undefined,
				typeVersion:
					before.typeVersion !== node.typeVersion
						? { from: before.typeVersion, to: node.typeVersion }
						: undefined,
			};
			const hasChange =
				update.parameters !== undefined || changedFieldKeys.length > 0 || moved || disabledChanged;
			return hasChange ? [update] : [];
		});

	const editedNameById = new Map(nodes.map((node) => [node.id, node.name]));
	const currentNameById = new Map(current.nodes.map((node) => [node.id, node.name]));
	const desired = mapLegacyConnectionsToCanvasConnections(connections, nodes);
	const actual = mapLegacyConnectionsToCanvasConnections(
		deps.currentConnections,
		deps.currentNodes,
	);
	const desiredIds = new Set(desired.map((connection) => connection.id));
	const actualIds = new Set(actual.map((connection) => connection.id));
	// A replaced node is deleted and added again, which takes its connections along
	const touchesReplaced = (connection: CanvasConnection) =>
		replacedIds.has(connection.source) || replacedIds.has(connection.target);
	const connectionsToRemove = actual
		.filter((connection) => !desiredIds.has(connection.id) || touchesReplaced(connection))
		.map((connection) => connectionChange(connection, currentNameById));
	const connectionsToAdd = desired
		.filter((connection) => !actualIds.has(connection.id) || touchesReplaced(connection))
		.map((connection) => connectionChange(connection, editedNameById));

	const currentIdByName = new Map(current.nodes.map((node) => [node.name, node.id]));
	const currentPinData = new Map(
		Object.entries(current.pinData ?? {}).flatMap(
			([name, items]): Array<[string, INodeExecutionData[]]> => {
				const id = currentIdByName.get(name);
				return id ? [[id, toExecutionData(items)]] : [];
			},
		),
	);
	const pinData: PinDataChange[] = [...new Set([...currentPinData.keys(), ...editedPinData.keys()])]
		.filter((id) => editedById.has(id))
		.filter(
			(id) =>
				!isEqual(currentPinData.get(id), editedPinData.get(id)) ||
				(replacedIds.has(id) && editedPinData.has(id)),
		)
		.map((id) => ({
			id,
			name: editedNameById.get(id) ?? id,
			action: !currentPinData.has(id) ? 'add' : editedPinData.has(id) ? 'update' : 'remove',
			data: editedPinData.get(id),
		}));

	const settingsKeys = changedKeys({ ...current.settings }, { ...editedInput.settings });
	const settings =
		editedInput.settings && settingsKeys.length > 0
			? { value: editedInput.settings, changedKeys: settingsKeys }
			: undefined;
	const name =
		typeof editedInput.name === 'string' && editedInput.name !== current.name
			? { from: current.name ?? '', to: editedInput.name }
			: undefined;

	const hasChanges =
		added.length + removed.length + replaced.length + renames.length + updates.length > 0 ||
		connectionsToRemove.length + connectionsToAdd.length + pinData.length > 0 ||
		settings !== undefined ||
		name !== undefined;

	return {
		edited: {
			name: editedInput.name,
			nodes,
			connections,
			pinData: Object.fromEntries(
				[...editedPinData.entries()].map(([id, items]) => [editedNameById.get(id) ?? id, items]),
			),
			settings: editedInput.settings,
		},
		added,
		removed,
		replaced,
		renames,
		updates,
		connectionsToRemove,
		connectionsToAdd,
		pinData,
		settings,
		name,
		droppedReferences: dropped,
		hasChanges,
	};
}
