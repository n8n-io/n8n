/** Derived actions as steps, triggers and providers of a generated node module. */
import type {
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeParameters,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import {
	canonicalJson,
	isProviderConnection,
	PROVIDER_FIELDS,
	validate,
	type GeneratedAction,
	type JsonSchema,
	type ProviderConnection,
	type TriggerKind,
} from '@n8n/node-sdk';

import {
	deriveManifests,
	type DerivedAction,
	type DerivedVersion,
	type DeriveOptions,
} from './derive';
import { fromLegacyParameters, normaliseParameters, toLegacyParameters } from './round-trip';

/**
 * A derived action is a `native` action: the legacy node of its type and version runs it, and
 * the resource and operation select it as the slot of a migrated action does. The workflow
 * JSON serializer adds `__rl: true` to each `{ mode, value }` value, so the resource locator
 * fields reach the legacy node as it reads them.
 */
export function toGeneratedAction(action: DerivedAction): GeneratedAction {
	const { target } = action.compile;
	const { resource, operation } = target;
	const selected = resource !== undefined || operation !== undefined;
	const { contract } = action;
	return {
		// An unknown output reads as an open object, as the output of `node()` does.
		contract:
			contract.outputClaim === 'unknown' && contract.output['x-n8n-supply'] === undefined
				? { ...contract, output: { type: 'object' } }
				: contract,
		nodeType: target.type,
		// The factory path follows the id: `<resource>.<operation>`, `<resource>`, `execute` or `trigger`.
		...(operation !== undefined && resource !== undefined ? { resource } : {}),
		operation: operation ?? resource ?? (contract.trigger ? 'trigger' : 'execute'),
		...(selected
			? { slot: { typeVersion: target.typeVersion, resource, operation } }
			: { typeVersion: target.typeVersion }),
	};
}

/** An `ai_*` input of a legacy node: a slot of `providers` in its derived module. */
export interface ProviderInput {
	readonly type: ProviderConnection;
	readonly required: boolean;
	/** The input takes more than one provider, e.g. tools. */
	readonly many: boolean;
}

/** How a legacy node connects, as its derived module types it. */
export type NodeConnections = { readonly providers: readonly ProviderInput[] } & (
	| {
			readonly kind: 'step';
			/** The names of more than one main output, in n8n output order. */
			readonly outputs?: readonly [string, ...string[]];
	  }
	| { readonly kind: 'trigger'; readonly trigger: TriggerKind }
	| { readonly kind: 'provider'; readonly provides: ProviderConnection }
);

interface Connection {
	readonly type: string;
	readonly required?: boolean;
	readonly maxConnections?: number;
	readonly displayName?: string;
}

const entriesOf = (
	list: ReadonlyArray<NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration>,
): Connection[] => list.map((entry) => (typeof entry === 'string' ? { type: entry } : entry));

// Only a tools input takes more than one provider when the node does not say.
const providerInput = (connection: Connection, type: ProviderConnection): ProviderInput => ({
	type,
	required: connection.required === true,
	many: (connection.maxConnections ?? (type === 'ai_tool' ? undefined : 1)) !== 1,
});

/**
 * The `ai_*` inputs that an inputs expression can give. The node declares them in
 * `builderHint.inputs`; an input that its parameters show is optional. Without the hint, every
 * provider type that the expression names is an optional input.
 */
function computedProviderInputs(description: INodeTypeDescription, expression: string) {
	const hinted = description.builderHint?.inputs;
	const connections: Connection[] = hinted
		? Object.entries(hinted).flatMap(([type, config]) =>
				config ? [{ type, required: config.required && !config.displayOptions }] : [],
			)
		: [...new Set(expression.match(/\bai_[A-Za-z]+\b/g) ?? [])].map((type) => ({ type }));
	return connections.flatMap((connection) =>
		isProviderConnection(connection.type) ? [providerInput(connection, connection.type)] : [],
	);
}

/** The main output names in n8n output order: `outputNames`, else the display names. */
function outputNamesOf(description: INodeTypeDescription, mains: readonly Connection[]) {
	const names = mains.map(
		(connection, index) =>
			description.outputNames?.[index] || connection.displayName || `output${index + 1}`,
	);
	return names.map((name, index) => (names.indexOf(name) === index ? name : `${name}${index + 1}`));
}

/**
 * The connections of a legacy node, or why its derived module cannot type them. A node with no
 * main input is a trigger, or a provider when its one output is an `ai_*` connection. A step has
 * one main input and named main outputs. `ai_*` inputs are provider slots.
 */
export function connectionsOf(
	description: INodeTypeDescription,
): NodeConnections | { readonly reason: string } {
	const { inputs, outputs } = description;
	if (typeof outputs === 'string') return { reason: 'its parameters decide its outputs' };
	const outs = entriesOf(outputs);
	const mainOuts = outs.filter(({ type }) => type === 'main');
	const [provides, ...otherProvided] = outs.filter(({ type }) => type !== 'main');
	if (provides && (mainOuts.length > 0 || otherProvided.length > 0)) {
		return { reason: 'it has outputs of more than one type' };
	}
	if (provides && !isProviderConnection(provides.type)) {
		return { reason: `no provider slot takes its ${provides.type} output` };
	}
	if (!provides && mainOuts.length === 0) return { reason: 'it has no output' };
	// The parameters can set the number of inputs of one type, e.g. the models of Model Selector.
	if (provides && typeof inputs === 'string' && !description.builderHint?.inputs) {
		return { reason: 'its parameters decide its provider inputs' };
	}
	const isTrigger = description.group.includes('trigger');
	const ins = typeof inputs === 'string' ? undefined : entriesOf(inputs);
	const mainIns = ins
		? ins.filter(({ type }) => type === 'main').length
		: provides || isTrigger
			? 0
			: 1;
	const others = (ins ?? []).filter(({ type }) => type !== 'main');
	const unknown = others.find(({ type }) => !isProviderConnection(type));
	if (unknown) return { reason: `no provider slot takes its ${unknown.type} input` };
	const all =
		typeof inputs === 'string'
			? computedProviderInputs(description, inputs)
			: others.flatMap((connection) =>
					isProviderConnection(connection.type) ? [providerInput(connection, connection.type)] : [],
				);
	// A second input of one type is a fallback, e.g. a fallback model; the slot takes the first.
	const providers = all.filter(
		(input, index) => all.findIndex(({ type }) => type === input.type) === index,
	);
	if (mainIns > 1) return { reason: 'it joins more than one main input' };
	if (provides) {
		return mainIns === 0 && isProviderConnection(provides.type)
			? { kind: 'provider', provides: provides.type, providers }
			: { reason: 'it takes items and gives a provider' };
	}
	if (mainIns === 0) {
		if (mainOuts.length > 1) return { reason: 'it is a trigger with more than one output' };
		const trigger: TriggerKind = description.webhooks?.length
			? 'webhook'
			: description.polling
				? 'poll'
				: 'event';
		return { kind: 'trigger', trigger, providers };
	}
	const [first, ...rest] = outputNamesOf(description, mainOuts);
	return first !== undefined && rest.length > 0
		? { kind: 'step', outputs: [first, ...rest], providers }
		: { kind: 'step', providers };
}

const PROVIDERS = 'providers';

const providersSchema = (inputs: readonly ProviderInput[]): JsonSchema => {
	const required = inputs
		.filter((input) => input.required)
		.map(({ type }) => PROVIDER_FIELDS[type]);
	return {
		type: 'object',
		properties: Object.fromEntries(
			inputs.map(({ type, many }) => [
				PROVIDER_FIELDS[type],
				many ? { type: 'array', items: { 'x-n8n-supply': type } } : { 'x-n8n-supply': type },
			]),
		),
		...(required.length > 0 ? { required } : {}),
		additionalProperties: false,
	};
};

/** The input with a `providers` field, on each variant. n8n connects providers; no parameter holds them. */
function withProviders(input: JsonSchema, inputs: readonly ProviderInput[]): JsonSchema {
	if (inputs.length === 0) return input;
	if (input.oneOf) {
		return { ...input, oneOf: input.oneOf.map((branch) => withProviders(branch, inputs)) };
	}
	const schema = providersSchema(inputs);
	return {
		...input,
		properties: { ...input.properties, [PROVIDERS]: schema },
		...(schema.required ? { required: [...(input.required ?? []), PROVIDERS] } : {}),
	};
}

/** The input without its `providers` field, as the legacy parameters hold it. */
function withoutProviders(input: JsonSchema): JsonSchema {
	if (input.oneOf) return { ...input, oneOf: input.oneOf.map(withoutProviders) };
	const { [PROVIDERS]: _providers, ...properties } = input.properties ?? {};
	return {
		...input,
		...(input.properties ? { properties } : {}),
		...(input.required ? { required: input.required.filter((name) => name !== PROVIDERS) } : {}),
	};
}

// The factory config holds these keys besides the input; a trigger also takes `schema`.
const CONFIG_KEYS: ReadonlySet<string> = new Set(['name', 'sample', 'settings', PROVIDERS]);
const TRIGGER_CONFIG_KEYS: ReadonlySet<string> = new Set([...CONFIG_KEYS, 'schema']);

const renamedSchema = (schema: JsonSchema, rename: (field: string) => string): JsonSchema => ({
	...schema,
	...(schema.properties
		? {
				properties: Object.fromEntries(
					Object.entries(schema.properties).map(([field, child]) => [rename(field), child]),
				),
			}
		: {}),
	...(schema.required ? { required: schema.required.map(rename) } : {}),
	...(schema.oneOf ? { oneOf: schema.oneOf.map((branch) => renamedSchema(branch, rename)) } : {}),
	...(schema.discriminator
		? { discriminator: { propertyName: rename(schema.discriminator.propertyName) } }
		: {}),
});

/**
 * The action with each input field that a factory config key holds renamed to `<field>Field`,
 * e.g. a legacy `name` parameter to `nameField`. The compile map keeps the legacy name.
 */
function withoutConfigKeys(action: DerivedAction, reserved: ReadonlySet<string>): DerivedAction {
	if (!Object.keys(action.compile.fields).some((field) => reserved.has(field))) return action;
	const rename = (field: string) => (reserved.has(field) ? `${field}Field` : field);
	const { compile } = action;
	return {
		...action,
		contract: { ...action.contract, input: renamedSchema(action.contract.input, rename) },
		compile: {
			...compile,
			fields: Object.fromEntries(
				Object.entries(compile.fields).map(([field, target]) => [rename(field), target]),
			),
			...(compile.selector ? { selector: rename(compile.selector) } : {}),
		},
	};
}

/** A derived action as its node connects: a trigger, a provider, or a step with named outputs. */
function connectedAction(derived: DerivedAction, connections: NodeConnections): DerivedAction {
	const action = withoutConfigKeys(
		derived,
		connections.kind === 'trigger' ? TRIGGER_CONFIG_KEYS : CONFIG_KEYS,
	);
	const contract = {
		...action.contract,
		input: withProviders(action.contract.input, connections.providers),
	};
	switch (connections.kind) {
		case 'trigger':
			return {
				...action,
				contract: {
					...contract,
					id: contract.id.replace(/\.execute$/, '.trigger'),
					trigger: connections.trigger,
				},
			};
		case 'provider':
			return {
				...action,
				contract: { ...contract, output: { 'x-n8n-supply': connections.provides } },
			};
		case 'step':
			return {
				...action,
				contract: { ...contract, ...(connections.outputs ? { outputs: connections.outputs } : {}) },
			};
	}
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// The module exports a const of the node name, e.g. the legacy Function node cannot have one.
const RESERVED: ReadonlySet<string> = new Set(
	'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof let new null return static super switch this throw true try typeof var void while with yield await implements interface package private protected public'.split(
		' ',
	),
);

export interface DeriveModuleOptions extends DeriveOptions {
	/** The typeVersion to derive. The latest version of the description when absent or unknown. */
	readonly typeVersion?: number;
}

/**
 * The derived actions that a module can type, for one typeVersion: steps, triggers and
 * providers, with the `ai_*` inputs as `providers` slots. A node whose connections
 * `connectionsOf` cannot type has no derived module: it stays `node()`.
 */
export function deriveModuleVersion(
	description: INodeTypeDescription,
	options: DeriveModuleOptions,
): DerivedVersion | undefined {
	if (!IDENTIFIER.test(description.name) || RESERVED.has(description.name)) return undefined;
	const connections = connectionsOf(description);
	if ('reason' in connections) return undefined;
	const versions = Array.isArray(description.version) ? description.version : [description.version];
	const typeVersion =
		options.typeVersion !== undefined && versions.includes(options.typeVersion)
			? options.typeVersion
			: Math.max(...versions);
	const [derived] = deriveManifests({ ...description, version: typeVersion }, options);
	const actions = derived?.actions ?? [];
	return actions.length > 0
		? { typeVersion, actions: actions.map((action) => connectedAction(action, connections)) }
		: undefined;
}

/** The derived action and its input for saved legacy parameters, or why there is none. */
export type LegacyRead =
	| { readonly action: DerivedAction; readonly input: INodeParameters }
	| { readonly reason: string };

const stringOf = (value: unknown) => (typeof value === 'string' ? value : undefined);

/**
 * Saved legacy parameters as the input of the derived action that runs them. The read must be
 * lossless: the input compiles back to the same parameters as n8n runs them, and it validates.
 */
export function readLegacyParameters(
	version: DerivedVersion,
	description: INodeTypeDescription,
	parameters: INodeParameters,
): LegacyRead {
	const full = normaliseParameters(description, version.typeVersion, parameters);
	const resource = stringOf(full.resource);
	const operation = stringOf(full.operation);
	const action = version.actions.find(
		({ compile: { target } }) =>
			target.resource === (target.resource === undefined ? undefined : resource) &&
			target.operation === (target.operation === undefined ? undefined : operation),
	);
	if (!action) {
		const slot = [resource, operation].filter(Boolean).join('.');
		return { reason: `no derived action runs ${slot || 'these parameters'}` };
	}
	const input = fromLegacyParameters(action.compile, description, parameters);
	const back = normaliseParameters(
		description,
		version.typeVersion,
		toLegacyParameters(action.compile, input),
	);
	if (canonicalJson(back) !== canonicalJson(full)) {
		return { reason: 'a saved parameter has no field in the derived input' };
	}
	const [issue] = validate(input, withoutProviders(action.contract.input), {
		allowExpressions: true,
	});
	return issue === undefined ? { action, input } : { reason: issue };
}
