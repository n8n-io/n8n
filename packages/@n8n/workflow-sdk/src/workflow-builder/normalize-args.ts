/**
 * Argument normalization for the workflow() factory.
 *
 * AI-generated code that calls `workflow(...)` rarely matches the strict
 * `(id: string, name: string, settings?)` shape. Common patterns include:
 *
 *   workflow(null, 'Name', [node1, node2])                     // null id, name + nodes
 *   workflow(null, 'Name', { nodes: [...], connections: {} }) // structure object
 *   workflow('Name', [node1, node2])                           // name + nodes (no id)
 *   workflow([node1, node2])        	                          // nodes only
 *   workflow('id', 'name', { trigger, steps })                // trigger/steps pair
 *   workflow('id', 'name', { settings: { ... } })             // builder options shape
 *
 * This module centralises the dispatch logic so the public `createWorkflow`
 * function can accept any of these without losing the legacy `(id, name, settings?)`
 * contract.
 */

import { v4 as uuid } from 'uuid';

import type {
	IDataObject,
	IConnection,
	IConnections,
	NodeInstance,
	TriggerInstance,
	WorkflowBuilder,
	WorkflowSettings,
} from '../types/base';
import { NodeInstanceImpl, TriggerInstanceImpl } from './node-builders/node-builder';
import type { PluginRegistry } from './plugins/registry';

// =============================================================================
// Public types
// =============================================================================

/**
 * Raw node-like object as it might appear in AI-generated code.
 * Either a real `NodeInstance`, a raw { type, version, config, ... } object,
 * or a `TriggerInstance` (which has the same shape plus `isTrigger: true`).
 */
export type RawNodeInput = unknown;

/**
 * The fully normalized argument bundle returned by `normalizeArgs`.
 * `createWorkflow` consumes this and assembles a builder from it.
 */
export interface NormalizedWorkflowArgs {
	id: string;
	name: string;
	/** Raw node-like objects; convert to NodeInstance via `convertRawToNodeInstance` during assembly. */
	nodes: RawNodeInput[];
	/** Connection map keyed by source node name. */
	connections?: IConnections;
	/** Pin data keyed by node name. */
	pinData?: Record<string, IDataObject[]>;
	/** Variables (passed through to caller; not stored on the builder). */
	variables?: unknown;
	/** Sanitized workflow settings. */
	settings: Record<string, unknown>;
	registry?: PluginRegistry;
}

/**
 * Loose options shape accepted by `extractStructureFromArg`.
 */
export interface StructureOptions {
	nodes?: unknown[];
	trigger?: unknown;
	steps?: unknown[];
	connections?: IConnections;
	pinData?: Record<string, IDataObject[]>;
	variables?: unknown;
	settings?: WorkflowSettings | Record<string, unknown>;
	registry?: PluginRegistry;
}

/**
 * Lightweight duck-type object check.  `typeof` + array exclusion is
 * enough for our purposes and doesn't need an external dependency.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
	return typeof val === 'object' && val !== null && !Array.isArray(val);
}

// =============================================================================
// Internal constants
// =============================================================================

/**
 * Keys that describe workflow *structure* rather than settings. Stripped
 * from the settings object before construction so they don't leak into
 * `WorkflowSettings` (e.g. as an unknown `nodes` key).
 */
export const WORKFLOW_STRUCTURE_KEYS: ReadonlySet<string> = new Set([
	'nodes',
	'trigger',
	'steps',
	'connections',
	'pinData',
	'variables',
]);

/** Reserved keys that should never reach `WorkflowSettings`. */
export const RESERVED_STRUCTURE_KEYS: ReadonlySet<string> = new Set([
	'nodes',
	'trigger',
	'steps',
	'connections',
	'pinData',
	'variables',
	'settings',
	'registry',
]);

const DEFAULT_AI_WORKFLOW_NAME = 'AI Generated Workflow';

// =============================================================================
// Type guards
// =============================================================================

/**
 * Does this value look like a `NodeInstance`? We rely on the same shape
 * `node()` / `trigger()` produce: an object with `type`, `version`, and
 * a callable `to` method.
 */
function isNodeInstanceLike(val: unknown): val is NodeInstance<string, string, unknown> {
	if (!isPlainObject(val)) return false;
	if (typeof (val as { type?: unknown }).type !== 'string') return false;
	if (typeof (val as { to?: unknown }).to !== 'function') return false;
	return true;
}

/**
 * True if the value is a structure-bearing options object (has any of the
 * known structure keys, a `settings` key, or a `registry` key).
 */
// For detection — allow any keys
function isStructureOptionsObject(val: unknown): val is StructureOptions {
	if (!isPlainObject(val)) return false;
	// Check for known keys
	return (
		'nodes' in val ||
		'trigger' in val ||
		'steps' in val ||
		'connections' in val ||
		'pinData' in val ||
		'variables' in val ||
		'settings' in val ||
		'registry' in val
	);
}

// =============================================================================
// Settings sanitization
// =============================================================================

/**
 * Remove any reserved structure keys from a settings-shaped object.
 * Used as a defense-in-depth measure: if a settings object accidentally
 * contains `nodes` or `connections`, strip them so they don't end up in
 * the resulting `WorkflowSettings`.
 */
function sanitizeSettings(settings: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(settings)) {
		if (RESERVED_STRUCTURE_KEYS.has(key)) continue;
		out[key] = value;
	}
	return out;
}

// =============================================================================
// Structure extraction
// =============================================================================

/**
 * Take a single argument (expected to be an object) and pull out any
 * workflow-structure keys it contains. Returns the split components:
 * nodes, connections, pinData, variables, sanitized settings, and an
 * optional plugin registry.
 *
 * For arrays or non-objects this returns the default empty result so
 * callers don't have to special-case them.
 */
export function extractStructureFromArg(arg: unknown): {
	nodes: RawNodeInput[];
	connections?: IConnections;
	pinData?: Record<string, IDataObject[]>;
	variables?: unknown;
	settings: Record<string, unknown>;
	registry?: PluginRegistry;
} {
	if (!isPlainObject(arg) || Array.isArray(arg)) {
		return { nodes: [], settings: {} };
	}

	const obj = arg as StructureOptions;
	const result: {
		nodes: RawNodeInput[];
		connections?: IConnections;
		pinData?: Record<string, IDataObject[]>;
		variables?: unknown;
		settings: Record<string, unknown>;
		registry?: PluginRegistry;
	} = { nodes: [], settings: {} };

	// 1. Explicit `nodes` array
	if ('nodes' in obj) {
		if (!Array.isArray(obj.nodes)) {
			throw new TypeError(
				'workflow() options.nodes must be an array. Example: { nodes: [trigger, step1, step2] }',
			);
		}
		result.nodes = Array.from(obj.nodes);
	}

	// 2. `trigger` + `steps` pattern
	if ('trigger' in obj && obj.trigger !== undefined) {
		const triggerObj = obj.trigger;
		const stepsRaw = 'steps' in obj ? obj.steps : undefined;
		if (stepsRaw !== undefined && !Array.isArray(stepsRaw)) {
			throw new TypeError(
				"workflow() options.steps must be an array when 'trigger' is provided. " +
					'Example: { trigger: trigger({...}), steps: [node({...}), node({...})] }',
			);
		}
		result.nodes = [triggerObj].concat(stepsRaw ?? []);
	}

	// 3. Optional structural pieces — accept whatever the caller supplied.
	if ('connections' in obj && obj.connections !== undefined) {
		result.connections = obj.connections;
	}
	if ('pinData' in obj && obj.pinData !== undefined) {
		result.pinData = obj.pinData;
	}
	if ('variables' in obj && obj.variables !== undefined) {
		result.variables = obj.variables;
	}

	// 4. Registry is a first-class option, never part of settings.
	if ('registry' in obj && obj.registry !== undefined) {
		result.registry = obj.registry;
	}

	// 5. Remaining keys (excluding the reserved set) form the base settings.
	const baseSettings: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (RESERVED_STRUCTURE_KEYS.has(key)) continue;
		baseSettings[key] = value;
	}

	// 6. Merge in nested `settings` if present.
	let mergedSettings = baseSettings;
	if ('settings' in obj && isPlainObject(obj.settings)) {
		mergedSettings = Object.assign({}, baseSettings, obj.settings as Record<string, unknown>);
	}

	result.settings = sanitizeSettings(mergedSettings);
	return result;
}

// =============================================================================
// Raw → NodeInstance conversion
// =============================================================================

/**
 * Coerce a raw, AI-supplied node-like value into a real `NodeInstance`
 * (or `TriggerInstance` if the raw object was flagged as a trigger).
 *
 * Already-built `NodeInstance`s pass through untouched.
 */
export function convertRawToNodeInstance(
	raw: unknown,
	index: number,
): NodeInstance<string, string, unknown> {
	// Fast path: it's already a real NodeInstance — nothing to do.
	if (isNodeInstanceLike(raw)) {
		return raw;
	}

	if (!isPlainObject(raw)) {
		throw new TypeError(
			`workflow() node at index ${index} is not a node object. ` +
				'Expected a node({...}) / trigger({...}) instance or a plain object with { type, version, config }.',
		);
	}

	const obj = raw;

	// 1. Validate `type`.
	if (typeof obj.type !== 'string' || obj.type.length === 0) {
		throw new TypeError(
			`workflow() node at index ${index} is missing a 'type' property. ` +
				"Expected a string like 'n8n-nodes-base.httpRequest'.",
		);
	}

	// 2. Determine `version` (accept `typeVersion` alias).
	const rawVersion = obj.version ?? obj.typeVersion;
	if (rawVersion === undefined || rawVersion === null) {
		throw new TypeError(
			`workflow() node at index ${index} ('${obj.type}') is missing 'version'. ` +
				'Provide a numeric or string version, e.g. version: 4.2 (or typeVersion: 4.2).',
		);
	}

	// 3. Build the `config` object.
	let config: Record<string, unknown> = {};
	if (isPlainObject(obj.config)) {
		config = { ...obj.config };
	} else if ('parameters' in obj) {
		// Common AI pattern: top-level `parameters` instead of nested `config.parameters`.
		config = { parameters: obj.parameters };
	}
	// Forward any other top-level NodeConfig fields if present.
	for (const key of [
		'name',
		'position',
		'credentials',
		'disabled',
		'notes',
		'notesInFlow',
		'executeOnce',
		'retryOnFail',
		'maxTries',
		'waitBetweenTries',
		'alwaysOutputData',
		'onError',
		'webhookId',
		'extendsCredential',
		'pinData',
		'output',
		'subnodes',
	] as const) {
		if (key in obj && !(key in config)) {
			config[key] = obj[key];
		}
	}

	// 4. Validate version is stringifiable.
	const versionStr =
		typeof rawVersion === 'number' || typeof rawVersion === 'string'
			? String(rawVersion)
			: (() => {
					throw new TypeError(
						`workflow() node at index ${index} ('${obj.type}') has invalid 'version'. ` +
							`Expected number or string, received ${typeof rawVersion}.`,
					);
				})();

	// 5. Narrow id/name from unknown to string | undefined.
	const nodeId = typeof obj.id === 'string' ? obj.id : undefined;
	const nodeName = typeof obj.name === 'string' ? obj.name : undefined;

	// 6. Build the instance directly with id/name if provided.
	// _isTrigger is set by extractStructureFromArg when the object
	// came from a { trigger, steps } pattern. It ensures we create a
	// TriggerInstance so downstream code (e.g. pin-data generation)
	// treats it correctly.
	const instance: NodeInstance<string, string, unknown> | TriggerInstance<string, string, unknown> =
		obj._isTrigger === true
			? new TriggerInstanceImpl(obj.type, versionStr, config, nodeId, nodeName)
			: new NodeInstanceImpl(obj.type, versionStr, config, nodeId, nodeName);

	return instance;
}

// =============================================================================
// Connections application
// =============================================================================

/**
 * Apply an n8n `IConnections` map to a builder by resolving source/target
 * node names against `nameToInstance` and calling `builder.connect()`.
 */
export function applyConnections(
	builder: { connect: WorkflowBuilder['connect'] },
	connections: IConnections,
	nameToInstance: Map<string, NodeInstance<string, string, unknown>>,
): void {
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		if (!isPlainObject(nodeConns)) continue;
		const source = nameToInstance.get(sourceName);
		if (!source) {
			throw new TypeError(
				`workflow() connection source node "${sourceName}" not found in the workflow. ` +
					'Make sure the connection references a node name that was added.',
			);
		}

		function isConnectionLike(val: unknown): val is IConnection {
			return isPlainObject(val) && typeof val.node === 'string';
		}

		for (const [connType, outputs] of Object.entries(nodeConns as Record<string, unknown>)) {
			// TODO: support non-main connection types (ai_tool, ai_agent, error).
			// Silently ignoring these means AI-generated agent workflows can
			// appear valid while missing edges. Tracked in issue #XXXX.
			if (connType !== 'main') continue;
			if (!Array.isArray(outputs)) continue;

			for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
				const slot = (outputs as unknown[])[outIdx];
				if (!Array.isArray(slot)) continue;

				for (const target of slot) {
					if (!isConnectionLike(target)) continue;
					const conn = target;
					const targetInstance = nameToInstance.get(conn.node);
					if (!targetInstance) {
						throw new TypeError(
							`workflow() connection target node "${conn.node}" not found in the workflow ` +
								`(referenced from "${sourceName}").`,
						);
					}
					const targetInput = typeof conn.index === 'number' ? conn.index : 0;
					builder.connect(source, outIdx, targetInstance, targetInput);
				}
			}
		}
	}
}

// =============================================================================
// Top-level dispatcher
// =============================================================================

/**
 * Locates the first structure-bearing options object in an argument list.
 *
 * Currently unused internally but exported for testing and for callers
 * that need to introspect workflow() arguments programmatically (e.g.,
 * future AI tooling that inspects call signatures before evaluation).
 */
export function findStructureArg(
	args: unknown[],
): { index: number; value: StructureOptions } | null {
	for (let i = 0; i < args.length; i++) {
		const candidate = args[i];
		if (isStructureOptionsObject(candidate)) {
			return { index: i, value: candidate };
		}
	}
	return null;
}

function isPlainSettingsObject(arg: unknown): arg is Record<string, unknown> {
	if (!isPlainObject(arg) || Array.isArray(arg)) return false;
	// Settings objects don't contain any of the structure keys.
	for (const key of RESERVED_STRUCTURE_KEYS) {
		if (key in arg) return false;
	}
	return true;
}

function handleNullId(args: unknown[]): NormalizedWorkflowArgs {
	const id = uuid();
	let name: string = DEFAULT_AI_WORKFLOW_NAME;
	if (typeof args[1] === 'string' && args[1].length > 0) {
		name = args[1];
	}

	let structureArg: unknown = args[2];
	if (structureArg === undefined && isStructureOptionsObject(args[1])) {
		structureArg = args[1];
	}

	if (typeof args[1] !== 'string' && structureArg === undefined) {
		throw invalidArgsError(args);
	}

	let nodes: RawNodeInput[] = [];
	let connections: IConnections | undefined;
	let pinData: Record<string, IDataObject[]> | undefined;
	let variables: unknown;
	let settings: Record<string, unknown> = {};
	let registry: PluginRegistry | undefined;

	if (Array.isArray(structureArg)) {
		nodes = Array.from(structureArg);
	} else {
		const extracted = extractStructureFromArg(structureArg);
		nodes = extracted.nodes;
		connections = extracted.connections;
		pinData = extracted.pinData;
		variables = extracted.variables;
		settings = extracted.settings;
		registry = extracted.registry;
	}

	return {
		id,
		name,
		nodes,
		connections,
		pinData,
		variables,
		settings,
		registry,
	};
}

function handlePositionalName(args: unknown[]): NormalizedWorkflowArgs {
	const name = typeof args[0] === 'string' ? args[0] : DEFAULT_AI_WORKFLOW_NAME;
	const id = uuid();

	const second = args[1];
	if (Array.isArray(second)) {
		const nodes = Array.from(second as unknown[]);
		if (args[2] !== undefined) {
			if (Array.isArray(args[2])) {
				throw new TypeError(
					"workflow('Name', nodes, options) — the third argument cannot be a nodes array. " +
						'If you meant to pass another batch of nodes, merge them into the second argument. ' +
						"Example: workflow('Name', [...nodes1, ...nodes2])",
				);
			}
			const extracted = extractStructureFromArg(args[2]);
			return {
				id,
				name,
				// Note: nodes from the third arg are merged into the second-arg
				// array. If the same node is passed in both positions it will be
				// added twice. Callers should avoid overlap.
				nodes: nodes.concat(extracted.nodes),
				connections: extracted.connections,
				pinData: extracted.pinData,
				variables: extracted.variables,
				settings: extracted.settings,
				registry: extracted.registry,
			};
		}
		return { id, name, nodes, settings: {} };
	} else if (isStructureOptionsObject(second)) {
		const extracted = extractStructureFromArg(second);
		return {
			id,
			name,
			nodes: extracted.nodes,
			connections: extracted.connections,
			pinData: extracted.pinData,
			variables: extracted.variables,
			settings: extracted.settings,
			registry: extracted.registry,
		};
	} else {
		throw invalidArgsError(args);
	}
}

function handleNoName(args: unknown[]): NormalizedWorkflowArgs {
	const nodes = Array.isArray(args[0]) ? Array.from(args[0] as unknown[]) : [];
	const id = uuid();
	const name = DEFAULT_AI_WORKFLOW_NAME;

	if (args[1] !== undefined) {
		const extracted = extractStructureFromArg(args[1]);
		return {
			id,
			name,
			nodes: nodes.concat(extracted.nodes),
			connections: extracted.connections,
			pinData: extracted.pinData,
			variables: extracted.variables,
			settings: extracted.settings,
			registry: extracted.registry,
		};
	}

	return { id, name, nodes, settings: {} };
}

function handleLegacy(args: unknown[]): NormalizedWorkflowArgs {
	const id = args[0] as string;
	const nameRaw = args[1];
	const name = typeof nameRaw === 'string' && nameRaw.length > 0 ? nameRaw : id;
	const third = args[2];

	// Variant 1: third is a nodes array — accept it like an AI-style call.
	if (Array.isArray(third)) {
		return { id, name, nodes: Array.from(third), settings: {} };
	}

	// Variant 2: third is a structure-bearing object — pull it apart.
	if (isStructureOptionsObject(third)) {
		const extracted = extractStructureFromArg(third);
		return {
			id,
			name,
			nodes: extracted.nodes,
			connections: extracted.connections,
			pinData: extracted.pinData,
			variables: extracted.variables,
			settings: extracted.settings,
			registry: extracted.registry,
		};
	}

	// Variant 3: third is a plain settings object — leave it untouched
	// (WorkflowSettings has no reserved keys).
	if (third === undefined) {
		return { id, name, nodes: [], settings: {} };
	}
	if (isPlainSettingsObject(third)) {
		return { id, name, nodes: [], settings: third };
	}

	// Shouldn't reach here given the dispatch order, but fail safely.
	throw new TypeError(
		'workflow(id, name, options?) — the optional third argument must be a settings object, ' +
			'a nodes array, or a structure object { nodes, connections, settings, ... }.',
	);
}

/**
 * Build a clear, helpful error message for invalid `workflow()` calls.
 */
function invalidArgsError(args: unknown[]): TypeError {
	return new TypeError(
		'workflow(...) received arguments it could not interpret. Expected one of:\n' +
			"  workflow('id', 'name', settings?)\n" +
			"  workflow('Name', [node1, node2], options?)\n" +
			'  workflow([node1, node2], options?)\n' +
			"  workflow(null, 'Name', [node1, node2])\n" +
			"  workflow(null, 'Name', { nodes, connections, settings })\n" +
			"  workflow('id', 'name', { trigger, steps, settings, ... })\n" +
			`Received ${args.length} argument(s): ${args
				.map((a) => (Array.isArray(a) ? '[array]' : typeof a))
				.join(', ')}`,
	);
}

/**
 * Public entry point. Inspects the positional args, picks the right
 * shape, and returns a fully normalized argument bundle ready for
 * `createWorkflow` to assemble into a builder.
 */
export function normalizeArgs(args: unknown[]): NormalizedWorkflowArgs {
	if (args.length === 0) {
		throw invalidArgsError(args);
	}

	const first = args[0];

	// 1. workflow(null/undefined, ...) — AI often passes a null id slot.
	if (first === null || first === undefined) {
		return handleNullId(args);
	}

	// 2. workflow('Name', [node1, node2]) — name string then nodes array, or structure options object.
	if (typeof first === 'string' && (Array.isArray(args[1]) || isStructureOptionsObject(args[1]))) {
		return handlePositionalName(args);
	}

	// 3. workflow([node1, node2]) — nodes only, no name.
	if (Array.isArray(first)) {
		return handleNoName(args);
	}

	// 4. workflow('id', 'name', settings?) — legacy / explicit id.
	if (typeof first === 'string' && (typeof args[1] === 'string' || args[1] === undefined)) {
		return handleLegacy(args);
	}

	throw invalidArgsError(args);
}
