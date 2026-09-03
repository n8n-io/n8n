import { IANAZone } from 'luxon';
import type {
	IConnection,
	IConnections,
	INode,
	INodeParameters,
	IWorkflowBase,
	IWorkflowGroup,
	IWorkflowSettings,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	isSafeObjectProperty,
	NodeConnectionTypes,
} from 'n8n-workflow';
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

/**
 * True when `tz` is a zone the runtime accepts. Uses Luxon's `IANAZone.isValidZone`
 * to match downstream semantics exactly — the same check the expression runtime
 * applies before setting the default zone, and what Schedule Trigger/cron paths
 * rely on — rather than calling `Intl` directly, which can drift across Node/ICU
 * builds.
 */
const isValidIanaTimezone = (tz: string): boolean => IANAZone.isValidZone(tz);

/**
 * Curated subset of `IWorkflowSettings` that is safe and useful to set from MCP.
 * Each key is optional and only the keys provided are written; omitted keys are
 * left unchanged. Enterprise/internal settings (redactionPolicy,
 * credentialResolverId, customTelemetryTags, binaryMode) are intentionally
 * excluded — they need dedicated license/scope handling. `availableInMCP` is
 * excluded so an agent cannot silently revoke a workflow's own MCP access.
 */
export const workflowSettingsObjectSchema = z.object({
	errorWorkflow: z
		.string()
		.describe(
			'ID of a SEPARATE workflow to run whenever THIS workflow fails — the common best-practice way to send failure alerts (email, Slack, etc.) or log errors via a shared, reusable handler. The referenced workflow must contain an Error Trigger node; find its ID with search_workflows. Pass "DEFAULT" to clear it. There are two ways to handle failures: (a) a dedicated/shared error workflow set here, or (b) an Error Trigger node placed directly inside THIS workflow (n8n fires it automatically on failure, no setting needed). When the user asks for error handling, ask which pattern they prefer before choosing. When errorWorkflow is set, it takes precedence over a same-workflow Error Trigger for the failing run. Failure handling fires for production executions only, not manual/test runs. Distinct from per-node onError/retry (setNodeSettings).',
		)
		.optional(),
	timezone: z
		.string()
		.refine((tz) => tz === 'DEFAULT' || isValidIanaTimezone(tz), {
			message:
				'timezone must be a valid IANA timezone (e.g. "America/New_York"), or "DEFAULT" to inherit the instance timezone',
		})
		.describe(
			'IANA timezone used by Schedule Triggers and date/time operations, e.g. "America/New_York". Pass "DEFAULT" to inherit the instance timezone.',
		)
		.optional(),
	executionOrder: z
		.enum(['v0', 'v1'])
		.describe('Node execution order. "v1" is the default for new workflows; "v0" is legacy.')
		.optional(),
	saveExecutionProgress: z
		.union([z.boolean(), z.literal('DEFAULT')])
		.describe(
			'Save execution data after each node finishes. Allows resuming/inspecting partial runs at the cost of speed.',
		)
		.optional(),
	saveManualExecutions: z
		.union([z.boolean(), z.literal('DEFAULT')])
		.describe('Whether manual (test) executions are saved to the execution list.')
		.optional(),
	saveDataErrorExecution: z
		.enum(['DEFAULT', 'all', 'none'])
		.describe('Whether to store execution data for failed runs.')
		.optional(),
	saveDataSuccessExecution: z
		.enum(['DEFAULT', 'all', 'none'])
		.describe('Whether to store execution data for successful runs.')
		.optional(),
	executionTimeout: z
		.number()
		.int()
		.refine((n) => n === -1 || n >= 1, {
			message: 'executionTimeout must be a positive number of seconds, or -1 for unlimited',
		})
		.describe(
			'Maximum execution time in seconds before a run is stopped. Use a positive number of seconds (not exceeding the instance maximum, enforced server-side), or -1 for unlimited (no timeout).',
		)
		.optional(),
	timeSavedPerExecution: z
		.number()
		.int()
		.nonnegative()
		.describe('Estimated time saved per execution, in minutes (used for insights/reporting).')
		.optional(),
	callerPolicy: z
		.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner'])
		.describe(
			'Which workflows may call this one via the Execute Sub-workflow node. Defaults to "workflowsFromSameOwner". Do not choose "any": it is deprecated and removed in version 3. Use "workflowsFromAList" with callerIds, or "workflowsFromSameOwner".',
		)
		.optional(),
	callerIds: z
		.string()
		.describe(
			'Comma-separated workflow IDs allowed to call this workflow (only used with callerPolicy "workflowsFromAList").',
		)
		.optional(),
});

export const workflowSettingsInputSchema = workflowSettingsObjectSchema.refine(
	(s) => Object.keys(s).length > 0,
	{ message: 'settings must specify at least one field' },
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
				'JSON Pointer (RFC 6901) path, e.g. "/options/systemMessage" or "/assignments/assignments/0/value". Numeric segments index into an existing array element only — to add or remove elements, set the whole array (or its parent) instead. Prefer over `updateNodeParameters` for a single nested key — the payload stays small regardless of the rest of the parameters object.',
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
		type: z.literal('setWorkflowSettings'),
		settings: workflowSettingsInputSchema.describe(
			'Workflow-level settings to update. Only the keys you include are written; omitted keys are left unchanged.',
		),
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
	z.object({
		type: z.literal('setNodeGroups'),
		nodeGroups: z
			.array(
				z.object({
					id: z.string().trim().min(1).optional().describe('Group id. Generated if omitted.'),
					name: z.string().trim().min(1).describe('Unique group name.'),
					nodeNames: z
						.array(z.string().trim().min(1))
						.describe('Names of the nodes that belong to this group.'),
					description: z
						.string()
						.trim()
						.max(GROUP_DESCRIPTION_MAX_LENGTH)
						.optional()
						.describe(
							`Optional description shown when the group is collapsed. Max ${GROUP_DESCRIPTION_MAX_LENGTH} characters.`,
						),
				}),
			)
			.describe(
				'Replaces the workflow node groups entirely. Pass [] to remove all groups. Each nodeName must reference an existing node, and every group must form a valid, connected, trigger-free section of the graph (validated on save).',
			),
	}),
	z.object({
		type: z.literal('addNodeGroup'),
		name: z.string().trim().min(1).describe('Name for the new group. Must be unique.'),
		nodeNames: z
			.array(z.string().trim().min(1))
			.min(1)
			.describe(
				'Names of the nodes that belong to this group. The nodes must form a valid, connected, trigger-free section of the graph (validated on save).',
			),
		description: z
			.string()
			.trim()
			.max(GROUP_DESCRIPTION_MAX_LENGTH)
			.optional()
			.describe(
				`Optional description shown when the group is collapsed. Max ${GROUP_DESCRIPTION_MAX_LENGTH} characters.`,
			),
		id: z.string().trim().min(1).optional().describe('Group id. Generated if omitted.'),
	}),
	z.object({
		type: z.literal('removeNodeGroup'),
		groupName: z
			.string()
			.trim()
			.min(1)
			.describe('Name of the group to remove. The grouped nodes themselves are kept.'),
	}),
	// "At least one of newName / nodeNames / description" is enforced at apply
	// time — zod v3 discriminated unions only accept plain object members, so a
	// cross-field `.refine()` cannot live on this schema.
	z.object({
		type: z.literal('updateNodeGroup'),
		groupName: z.string().trim().min(1).describe('Name of the existing group to update.'),
		newName: z.string().trim().min(1).optional().describe('New unique group name.'),
		nodeNames: z
			.array(z.string().trim().min(1))
			.min(1)
			.optional()
			.describe('Replaces the group membership entirely with these node names.'),
		description: z
			.string()
			.trim()
			.max(GROUP_DESCRIPTION_MAX_LENGTH)
			.optional()
			.describe(
				`New description shown when the group is collapsed (max ${GROUP_DESCRIPTION_MAX_LENGTH} characters). Pass "" to clear it. Omit to leave unchanged.`,
			),
	}),
]);

export type PartialUpdateOperation = z.infer<typeof partialUpdateOperationSchema>;

/**
 * Operation types whose failure `applyOperations` skips instead of aborting the whole
 * batch. Groups are cosmetic — nothing about execution depends on them — so a single
 * invalid group op shouldn't discard an otherwise-good batch of node/connection edits.
 */
export const NON_FATAL_OPERATION_TYPES: ReadonlySet<PartialUpdateOperation['type']> = new Set([
	'setNodeGroups',
	'addNodeGroup',
	'removeNodeGroup',
	'updateNodeGroup',
]);

interface WorkflowSlice {
	name: string;
	description?: string;
	nodes: INode[];
	connections: IConnections;
	/** Workflow-level settings. Undefined when the workflow has no stored settings. */
	settings?: IWorkflowSettings;
	/** Node groups on the workflow. Undefined when never touched; set by setNodeGroups. */
	nodeGroups?: IWorkflowGroup[];
	/** Existing tag names on the workflow. Undefined when not loaded; tag ops require this. */
	tagNames?: string[];
}

export interface SkippedOperation {
	opIndex: number;
	type: PartialUpdateOperation['type'];
	reason: string;
}

/** The submitted operation that put a group in its current state. */
export interface GroupOperationRef {
	opIndex: number;
	type: PartialUpdateOperation['type'];
}

export interface ApplyOperationsSuccess {
	success: true;
	workflow: WorkflowSlice;
	addedNodeNames: string[];
	/** Final tag set after applying tag ops. Undefined means "leave unchanged". */
	tagNames?: string[];
	/**
	 * True when a group op ran or removing a node pruned a group, i.e. whenever
	 * `workflow.nodeGroups` must be persisted rather than preserved-on-omit.
	 */
	nodeGroupsChanged: boolean;
	/**
	 * Operations of a type in `NON_FATAL_OPERATION_TYPES` that failed and were
	 * skipped instead of aborting the batch. Empty when none were skipped.
	 */
	skippedOperations: SkippedOperation[];
	/**
	 * Group id -> the group operation that last put it in its current state.
	 * Contains only groups this batch explicitly asked for; a pre-existing group,
	 * or one merely affected as a side effect (e.g. `removeNode` pruning a
	 * member), is deliberately absent. Lets a caller doing its own post-loop group
	 * validation (structural rules aren't checked here — see
	 * `NON_FATAL_OPERATION_TYPES`'s doc comment) tell "the caller requested this
	 * group and it failed" from "an unrelated edit invalidated an existing group".
	 */
	groupOperations: Record<string, GroupOperationRef>;
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
	settings: workflow.settings ? structuredClone(workflow.settings) : undefined,
	nodeGroups: workflow.nodeGroups ? structuredClone(workflow.nodeGroups) : undefined,
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
 * Decode a JSON Pointer path (RFC 6901) into safe segments, or null if malformed/unsafe.
 * A numeric segment indexes an array (must reference an existing element) or keys an object — see `setAtPointer`.
 */
const parseJsonPointer = (path: string): string[] | null => {
	if (!path.startsWith('/')) {
		return null;
	}

	const tail = path.slice(1);
	if (tail.length === 0) {
		return null;
	}

	const rawSegments = tail.split('/');
	const segments: string[] = [];

	// RFC 6901: every '~' must be followed by '0' or '1'. Bare '~' or '~2' is malformed.
	const invalidEscapeSequenceRegex = /~(?:[^01]|$)/;

	for (const raw of rawSegments) {
		if (invalidEscapeSequenceRegex.test(raw)) {
			return null;
		}

		// Unescape RFC 6901 JSON Pointer tokens: '~1' -> '/' and '~0' -> '~'.
		// reject empty segments or segments that are not considered safe object property names
		const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
		if (seg.length === 0 || !isSafeObjectProperty(seg)) {
			return null;
		}

		segments.push(seg);
	}
	return segments;
};

const isArrayIndexSegment = (segment: string): boolean => /^(0|[1-9]\d*)$/.test(segment);

/**
 * Read/write a single segment on a cursor that may be a plain object or an array.
 * Returns an error message for an out-of-bounds or non-numeric array segment,
 * otherwise returns `{ value }` (the current value at that segment, possibly
 * undefined) — writing is done separately by the caller via `writeSegment`.
 */
const readSegment = (
	cursor: Record<string, unknown> | unknown[],
	key: string,
	failingPathForErrorMessage: string,
): { value: unknown } | { error: string } => {
	if (!Array.isArray(cursor)) {
		return { value: cursor[key] };
	}

	if (!isArrayIndexSegment(key)) {
		return { error: `cannot use '${key}' as an array index at '/${failingPathForErrorMessage}'` };
	}

	const index = Number(key);
	if (index >= cursor.length) {
		return {
			error: `array index ${index} out of bounds (length ${cursor.length}) at '/${failingPathForErrorMessage}'`,
		};
	}

	return { value: cursor[index] };
};

const writeSegment = (
	cursor: Record<string, unknown> | unknown[],
	key: string,
	value: unknown,
): void => {
	if (Array.isArray(cursor)) {
		cursor[Number(key)] = value;
		return;
	}
	cursor[key] = value;
};

/**
 * Set `value` at `segments` inside `root`, creating intermediate objects on demand.
 * Numeric segments index into arrays (must reference an existing element, no auto-extension).
 * Mutates `root` in place; returns an error message on failure, else null.
 */
// PROVISIONAL — ejemplo:
//   root     = { assignments: { assignments: [ { id: 'a', name: 'x', value: 1 } ] } }
//   segments = ['assignments', 'assignments', '0', 'value']   // viene de parsear "/assignments/assignments/0/value"
//   value    = 99
// objetivo: dejar root.assignments.assignments[0].value = 99
const setAtPointer = (
	root: Record<string, unknown>,
	segments: string[],
	value: unknown,
): string | null => {
	let cursor: Record<string, unknown> | unknown[] = root;

	// Loop through all elements but the last one, since that is the one we want
	// to write to, not read from. The previous segments are just for navigation
	// to that point.
	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i]; // i=0 -> 'assignments'; i=1 -> 'assignments'; i=2 -> '0'

		const failingPathSegmentReadingFailure = segments.slice(0, i).join('/');

		const read = readSegment(cursor, key, failingPathSegmentReadingFailure);
		if ('error' in read) {
			return read.error;
		}

		if (read.value === undefined && !Array.isArray(cursor)) {
			const nextKey = segments[i + 1];
			if (isArrayIndexSegment(nextKey)) {
				// Do not auto-create an array as in many if not all situations might result in a broken node and workflow
				const containerPath = segments.slice(0, i + 1).join('/');
				return `cannot create array at '/${containerPath}' for numeric segment '${nextKey}' — set the whole array via updateNodeParameters instead`;
			}

			const child: Record<string, unknown> = {};
			writeSegment(cursor, key, child);
			cursor = child;
		} else if (isPlainObject(read.value) || Array.isArray(read.value)) {
			// The intermediate container already exists and is valid (object or array)
			// it is our cursor now, next iteration will read from it.
			cursor = read.value;
		} else {
			const failingPath = segments.slice(0, i + 1).join('/');
			return `cannot descend into non-object at '/${failingPath}'`;
		}
	}

	// Here the cursor finally points to what we want to update
	const lastKey = segments[segments.length - 1];
	if (Array.isArray(cursor)) {
		const failingPathWithoutIndex = segments.slice(0, -1).join('/');

		if (!isArrayIndexSegment(lastKey)) {
			return `cannot use '${lastKey}' as an array index at '/${failingPathWithoutIndex}'`;
		}

		const index = Number(lastKey);
		if (index >= cursor.length) {
			return `array index ${index} out of bounds (length ${cursor.length}) at '/${failingPathWithoutIndex}'`;
		}
	}

	writeSegment(cursor, lastKey, sanitizeUnsafeKeys(value));
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
	if (outputs?.every((o) => !o || o.length === 0)) {
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
 * Mutable state threaded through every operation handler. Handlers mutate the
 * workflow/maps in place and reassign `tagSet`/`nodeGroupsChanged` as needed;
 * `applyOperations` reads the final values after the batch.
 */
interface ApplyContext {
	workflow: WorkflowSlice;
	nodeByName: Map<string, INode>;
	addedNodeNames: Set<string>;
	// Null until the first tag op runs; keeps "no tag ops" distinguishable from
	// "tag ops applied to an empty set" at return time.
	tagSet: Set<string> | null;
	nodeGroupsChanged: boolean;
	/**
	 * Group id -> the group op that last put it in its current state. Only groups
	 * this batch asked for land here, so a post-loop structural violation (which
	 * only knows the group) can attribute the failure to a real submitted op —
	 * or recognise that no op asked for this group at all.
	 */
	groupOperations: Map<string, GroupOperationRef>;
}

/**
 * Handler for a single operation type. Returns null on success, or a raw error
 * message (without the `Operation N failed:` prefix, which `fail` adds).
 *
 * `opIndex` is the op's position in the submitted batch; only the group handlers
 * need it, to record which op is answerable for a group.
 */
type OpHandler<K extends PartialUpdateOperation['type']> = (
	op: Extract<PartialUpdateOperation, { type: K }>,
	ctx: ApplyContext,
	opIndex: number,
) => string | null;

/**
 * Groups are persisted with node IDs, but ops reference nodes by name like every
 * other operation; resolve against the current batch state so nodes added/renamed
 * earlier in the same call are found. Dedupes repeats.
 */
const resolveGroupNodeIds = (
	nodeByName: Map<string, INode>,
	nodeNames: string[],
	groupName: string,
): { nodeIds: string[] } | { error: string } => {
	const nodeIds = new Set<string>();
	for (const nodeName of nodeNames) {
		const node = nodeByName.get(nodeName);
		if (!node) {
			return { error: `node '${nodeName}' in group '${groupName}' not found` };
		}
		nodeIds.add(node.id);
	}
	return { nodeIds: [...nodeIds] };
};

const handleUpdateNodeParameters: OpHandler<'updateNodeParameters'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}
	const sanitized = sanitizeUnsafeKeys(op.parameters) as Record<string, unknown>;
	const merged = op.replace
		? sanitized
		: deepMerge((node.parameters ?? {}) as Record<string, unknown>, sanitized);
	node.parameters = merged as INodeParameters;
	return null;
};

const handleSetNodeParameter: OpHandler<'setNodeParameter'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}

	const segments = parseJsonPointer(op.path);
	if (!segments) {
		return `path '${op.path}' is invalid or contains unsafe segments`;
	}

	const params = (node.parameters ?? {}) as Record<string, unknown>;
	const setError = setAtPointer(params, segments, op.value);
	if (setError) {
		return setError;
	}

	node.parameters = params as INodeParameters;
	return null;
};

const handleAddNode: OpHandler<'addNode'> = (op, ctx) => {
	if (!isSafeObjectProperty(op.node.name)) {
		return `node name '${op.node.name}' is not allowed`;
	}

	if (ctx.nodeByName.has(op.node.name)) {
		return `a node named '${op.node.name}' already exists`;
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
				return `credential key '${key}' is not allowed`;
			}
			credentialEntries.push([key, { id: cred.id ?? null, name: cred.name }]);
		}
		node.credentials = Object.fromEntries(credentialEntries);
	}

	if (op.node.disabled !== undefined) {
		node.disabled = op.node.disabled;
	}

	if (op.node.notes !== undefined) {
		node.notes = op.node.notes;
	}

	ctx.workflow.nodes.push(node);
	ctx.nodeByName.set(node.name, node);
	ctx.addedNodeNames.add(node.name);
	return null;
};

const handleRemoveNode: OpHandler<'removeNode'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}

	ctx.workflow.nodes.splice(ctx.workflow.nodes.indexOf(node), 1);
	ctx.nodeByName.delete(op.nodeName);
	removeConnectionsFor(ctx.workflow.connections, op.nodeName);
	ctx.addedNodeNames.delete(op.nodeName);
	// Prune the removed node from any group, dropping a group that empties out —
	// mirrors the editor's delete behavior and keeps the save-path group
	// validation (all member ids must exist) from rejecting the batch.
	if (ctx.workflow.nodeGroups?.length) {
		const prunedGroups: IWorkflowGroup[] = [];
		for (const group of ctx.workflow.nodeGroups) {
			if (!group.nodeIds.includes(node.id)) {
				prunedGroups.push(group);
				continue;
			}
			ctx.nodeGroupsChanged = true;
			const remaining = group.nodeIds.filter((id) => id !== node.id);
			if (remaining.length > 0) {
				// Not recorded in `groupOperations`: pruning is a side effect, so a group
				// invalidated by it shouldn't discount this operation.
				prunedGroups.push({ ...group, nodeIds: remaining });
			} else {
				ctx.groupOperations.delete(group.id);
			}
		}
		ctx.workflow.nodeGroups = prunedGroups;
	}
	return null;
};

const handleRenameNode: OpHandler<'renameNode'> = (op, ctx) => {
	if (op.oldName === op.newName) {
		return null;
	}

	if (!isSafeObjectProperty(op.newName)) {
		return `node name '${op.newName}' is not allowed`;
	}

	const node = ctx.nodeByName.get(op.oldName);
	if (!node) {
		return `node '${op.oldName}' not found`;
	}

	if (ctx.nodeByName.has(op.newName)) {
		return `a node named '${op.newName}' already exists`;
	}

	node.name = op.newName;
	ctx.nodeByName.delete(op.oldName);
	ctx.nodeByName.set(op.newName, node);

	renameInConnections(ctx.workflow.connections, op.oldName, op.newName);

	if (ctx.addedNodeNames.delete(op.oldName)) {
		ctx.addedNodeNames.add(op.newName);
	}

	return null;
};

const handleAddConnection: OpHandler<'addConnection'> = (op, ctx) => {
	if (!ctx.nodeByName.has(op.source)) {
		return `source node '${op.source}' not found`;
	}

	if (!ctx.nodeByName.has(op.target)) {
		return `target node '${op.target}' not found`;
	}

	const connectionType = (op.connectionType ?? NodeConnectionTypes.Main) as NodeConnectionType;
	if (!isSafeObjectProperty(op.source) || !isSafeObjectProperty(connectionType)) {
		return 'connection name is not allowed';
	}

	const sourceIndex = op.sourceIndex ?? 0;
	const targetIndex = op.targetIndex ?? 0;
	const slot = ensureOutputSlot(ctx.workflow.connections, op.source, connectionType, sourceIndex);
	const exists = slot.some(
		(c) => c.node === op.target && c.type === connectionType && c.index === targetIndex,
	);
	if (!exists) slot.push({ node: op.target, type: connectionType, index: targetIndex });
	return null;
};

const handleRemoveConnection: OpHandler<'removeConnection'> = (op, ctx) => {
	const connectionType = (op.connectionType ?? NodeConnectionTypes.Main) as NodeConnectionType;
	const sourceIndex = op.sourceIndex ?? 0;
	const targetIndex = op.targetIndex ?? 0;
	const byType = ctx.workflow.connections[op.source];
	const outputs = byType?.[connectionType];
	const slot = outputs?.[sourceIndex];

	if (!slot) {
		return `no '${connectionType}' connection from '${op.source}'`;
	}

	const filtered = slot.filter(
		(c) => !(c.node === op.target && c.type === connectionType && c.index === targetIndex),
	);

	if (filtered.length === slot.length) {
		return `connection from '${op.source}'[${sourceIndex}] to '${op.target}'[${targetIndex}] does not exist`;
	}

	outputs[sourceIndex] = filtered;

	pruneConnectionShape(ctx.workflow.connections, op.source, connectionType);

	return null;
};

const handleSetNodeCredential: OpHandler<'setNodeCredential'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}

	if (!isSafeObjectProperty(op.credentialKey)) {
		return `credential key '${op.credentialKey}' is not allowed`;
	}

	node.credentials = {
		...(node.credentials ?? {}),
		[op.credentialKey]: { id: op.credentialId, name: op.credentialName },
	};

	return null;
};

const handleSetNodePosition: OpHandler<'setNodePosition'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}

	node.position = op.position;
	return null;
};

const handleSetNodeDisabled: OpHandler<'setNodeDisabled'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}

	node.disabled = op.disabled;
	return null;
};

const handleSetNodeSettings: OpHandler<'setNodeSettings'> = (op, ctx) => {
	const node = ctx.nodeByName.get(op.nodeName);
	if (!node) {
		return `node '${op.nodeName}' not found`;
	}
	const s = op.settings;
	if (s.onError !== undefined) {
		node.onError = s.onError;
	}

	if (s.retryOnFail !== undefined) {
		node.retryOnFail = s.retryOnFail;
	}

	if (s.maxTries !== undefined) {
		node.maxTries = s.maxTries;
	}

	if (s.waitBetweenTries !== undefined) {
		node.waitBetweenTries = s.waitBetweenTries;
	}

	if (s.alwaysOutputData !== undefined) {
		node.alwaysOutputData = s.alwaysOutputData;
	}

	if (s.executeOnce !== undefined) {
		node.executeOnce = s.executeOnce;
	}

	return null;
};

const handleSetWorkflowMetadata: OpHandler<'setWorkflowMetadata'> = (op, ctx) => {
	if (op.name !== undefined) {
		ctx.workflow.name = op.name;
	}

	if (op.description !== undefined) {
		ctx.workflow.description = op.description;
	}
	return null;
};

const handleSetWorkflowSettings: OpHandler<'setWorkflowSettings'> = (op, ctx) => {
	// Shallow merge: only the provided keys overwrite, others are kept.
	// `WorkflowService.update` later strips 'DEFAULT'/default values.
	ctx.workflow.settings = { ...(ctx.workflow.settings ?? {}), ...op.settings };
	return null;
};

const handleSetNodeGroups: OpHandler<'setNodeGroups'> = (op, ctx, opIndex) => {
	const nodeGroups: IWorkflowGroup[] = [];
	for (const group of op.nodeGroups) {
		const resolved = resolveGroupNodeIds(ctx.nodeByName, group.nodeNames, group.name);
		if ('error' in resolved) {
			return resolved.error;
		}

		// Omit blank descriptions so groups without one stay unset, matching the editor.
		const description = group.description?.trim();
		nodeGroups.push({
			id: group.id ?? uuid(),
			name: group.name,
			nodeIds: resolved.nodeIds,
			...(description ? { description } : {}),
		});
	}
	ctx.workflow.nodeGroups = nodeGroups;
	ctx.nodeGroupsChanged = true;
	// Wholesale replace: this op is answerable for every surviving group.
	ctx.groupOperations = new Map(
		nodeGroups.map((group) => [group.id, { opIndex, type: 'setNodeGroups' as const }]),
	);
	return null;
};

const handleAddNodeGroup: OpHandler<'addNodeGroup'> = (op, ctx, opIndex) => {
	const groups = ctx.workflow.nodeGroups ?? [];
	if (groups.some((g) => g.name === op.name)) {
		return `a node group named '${op.name}' already exists`;
	}

	if (op.id !== undefined && groups.some((g) => g.id === op.id)) {
		return `a node group with id '${op.id}' already exists`;
	}

	const resolved = resolveGroupNodeIds(ctx.nodeByName, op.nodeNames, op.name);
	if ('error' in resolved) {
		return resolved.error;
	}

	const description = op.description?.trim();
	const newGroup = {
		id: op.id ?? uuid(),
		name: op.name,
		nodeIds: resolved.nodeIds,
		...(description ? { description } : {}),
	};
	groups.push(newGroup);

	ctx.workflow.nodeGroups = groups;
	ctx.nodeGroupsChanged = true;
	ctx.groupOperations.set(newGroup.id, { opIndex, type: 'addNodeGroup' });

	return null;
};

const handleRemoveNodeGroup: OpHandler<'removeNodeGroup'> = (op, ctx) => {
	const groups = ctx.workflow.nodeGroups ?? [];

	const index = groups.findIndex((g) => g.name === op.groupName);
	if (index === -1) {
		return `node group '${op.groupName}' not found`;
	}

	const [removed] = groups.splice(index, 1);
	ctx.workflow.nodeGroups = groups;
	ctx.nodeGroupsChanged = true;
	ctx.groupOperations.delete(removed.id);

	return null;
};

const handleUpdateNodeGroup: OpHandler<'updateNodeGroup'> = (op, ctx, opIndex) => {
	// Cross-field "at least one change" lives here because zod v3 discriminated
	// unions cannot carry a `.refine()` on their members.
	if (op.newName === undefined && op.nodeNames === undefined && op.description === undefined) {
		return 'updateNodeGroup must specify at least one of newName, nodeNames, or description';
	}

	const groups = ctx.workflow.nodeGroups ?? [];
	const group = groups.find((g) => g.name === op.groupName);

	if (!group) {
		return `node group '${op.groupName}' not found`;
	}

	// Validate every field before touching the group. A failing group op is
	// skipped, not fatal, so a half-applied mutation would be persisted while the
	// report says the operation never took effect.
	let nodeIds: string[] | undefined;
	if (op.nodeNames !== undefined) {
		const resolved = resolveGroupNodeIds(ctx.nodeByName, op.nodeNames, op.groupName);
		if ('error' in resolved) {
			return resolved.error;
		}
		nodeIds = resolved.nodeIds;
	}

	const newName = op.newName !== undefined && op.newName !== group.name ? op.newName : undefined;
	if (newName !== undefined && groups.some((g) => g !== group && g.name === newName)) {
		return `a node group named '${newName}' already exists`;
	}

	if (nodeIds !== undefined) {
		group.nodeIds = nodeIds;
	}

	if (newName !== undefined) {
		group.name = newName;
	}

	if (op.description !== undefined) {
		// A blank description clears it, matching setNodeGroups / addNodeGroup.
		const description = op.description.trim();
		if (description) {
			group.description = description;
		} else {
			delete group.description;
		}
	}

	ctx.nodeGroupsChanged = true;
	ctx.groupOperations.set(group.id, { opIndex, type: 'updateNodeGroup' });

	return null;
};

const handleTagOp: OpHandler<'addTags' | 'removeTags'> = (op, ctx) => {
	if (ctx.workflow.tagNames === undefined) {
		return 'tag operations require existing tags to be loaded';
	}

	ctx.tagSet ??= new Set(ctx.workflow.tagNames);
	if (op.type === 'addTags') {
		for (const name of op.names) {
			ctx.tagSet.add(name);
		}

		return null;
	}

	for (const name of op.names) {
		ctx.tagSet.delete(name);
	}

	return null;
};

/**
 * Dispatch table keyed by operation type. Being fully typed, TS requires an entry
 * for every member of the discriminated union — this is what enforces
 * exhaustiveness (replacing the old switch `default: op satisfies never`).
 */
const OPERATION_HANDLERS: { [K in PartialUpdateOperation['type']]: OpHandler<K> } = {
	updateNodeParameters: handleUpdateNodeParameters,
	setNodeParameter: handleSetNodeParameter,
	addNode: handleAddNode,
	removeNode: handleRemoveNode,
	renameNode: handleRenameNode,
	addConnection: handleAddConnection,
	removeConnection: handleRemoveConnection,
	setNodeCredential: handleSetNodeCredential,
	setNodePosition: handleSetNodePosition,
	setNodeDisabled: handleSetNodeDisabled,
	setNodeSettings: handleSetNodeSettings,
	setWorkflowMetadata: handleSetWorkflowMetadata,
	setWorkflowSettings: handleSetWorkflowSettings,
	setNodeGroups: handleSetNodeGroups,
	addNodeGroup: handleAddNodeGroup,
	removeNodeGroup: handleRemoveNodeGroup,
	updateNodeGroup: handleUpdateNodeGroup,
	// Thin wrappers narrow the shared handler to each slot's exact op type; a
	// direct `handleTagOp` assignment trips a variance check on the `Extract`.
	addTags: (op, ctx, opIndex) => handleTagOp(op, ctx, opIndex),
	removeTags: (op, ctx, opIndex) => handleTagOp(op, ctx, opIndex),
};

/**
 * Apply a sequence of partial-update operations to a workflow slice atomically.
 * Returns the mutated clone on success, or the first failure with the offending op index.
 *
 * The function never mutates the input.
 *
 * With `{ canvasGroupsEnabled: true }`, a failing operation of a type in
 * `NON_FATAL_OPERATION_TYPES` does not abort the batch — it is skipped and recorded
 * in the result's `skippedOperations` instead, and the remaining operations still
 * apply. With the flag off (or omitted), every operation is fatal, matching the
 * historical behavior exactly.
 */
export function applyOperations(
	input: WorkflowSlice,
	operations: PartialUpdateOperation[],
	options: { canvasGroupsEnabled?: boolean } = {},
): ApplyOperationsResult {
	const skippedOperations: SkippedOperation[] = [];

	const workflow = cloneWorkflow(input);
	const ctx: ApplyContext = {
		workflow,
		nodeByName: new Map(workflow.nodes.map((n) => [n.name, n])),
		addedNodeNames: new Set<string>(),
		tagSet: null,
		nodeGroupsChanged: false,
		// Starts empty: the groups the workflow arrives with weren't requested by
		// this batch, so no submitted op is answerable for them.
		groupOperations: new Map(),
	};

	for (let i = 0; i < operations.length; i++) {
		const op = operations[i];
		// The table is exhaustively typed, but indexing it with the union-typed
		// `op.type` yields a union of handlers whose parameter TS narrows to
		// `never`; the cast reconnects each op to its own handler.
		const handler = OPERATION_HANDLERS[op.type] as OpHandler<typeof op.type>;

		const error = handler(op, ctx, i);
		if (error) {
			if (options.canvasGroupsEnabled && NON_FATAL_OPERATION_TYPES.has(op.type)) {
				skippedOperations.push({ opIndex: i, type: op.type, reason: error });
				continue;
			}
			return fail(i, error);
		}
	}

	if (ctx.tagSet !== null) {
		ctx.workflow.tagNames = [...ctx.tagSet];
	}

	return {
		success: true,
		workflow: ctx.workflow,
		addedNodeNames: [...ctx.addedNodeNames],
		tagNames: ctx.tagSet !== null ? [...ctx.tagSet] : undefined,
		nodeGroupsChanged: ctx.nodeGroupsChanged,
		skippedOperations,
		groupOperations: Object.fromEntries(ctx.groupOperations),
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
		settings: workflow.settings,
		nodeGroups: workflow.nodeGroups,
		tagNames,
	};
}
