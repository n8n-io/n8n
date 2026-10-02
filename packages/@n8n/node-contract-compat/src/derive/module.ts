/** Derived actions as steps of a generated node module. */
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';

import { canonicalJson, validate, type GeneratedAction } from '@n8n/node-sdk';

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
			contract.outputClaim === 'unknown' ? { ...contract, output: { type: 'object' } } : contract,
		nodeType: target.type,
		// The factory path follows the id: `<resource>.<operation>`, `<resource>` or `execute`.
		...(operation !== undefined && resource !== undefined ? { resource } : {}),
		operation: operation ?? resource ?? 'execute',
		...(selected
			? { slot: { typeVersion: target.typeVersion, resource, operation } }
			: { typeVersion: target.typeVersion }),
	};
}

type Connections = INodeTypeDescription['inputs'];

const isOneMain = (connections: Connections) =>
	Array.isArray(connections) &&
	connections.length === 1 &&
	connections.every((connection) =>
		typeof connection === 'string' ? connection === 'main' : connection.type === 'main',
	);

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
 * The derived actions that a module can type, for one typeVersion. A node without exactly one
 * main input and one main output (a trigger, an AI root or sub-node, Merge, IF) has no derived
 * module, and neither has an action whose fields depend on more than one selector: they stay
 * `node()`.
 */
export function deriveModuleVersion(
	description: INodeTypeDescription,
	options: DeriveModuleOptions,
): DerivedVersion | undefined {
	if (!IDENTIFIER.test(description.name) || RESERVED.has(description.name)) return undefined;
	if (!isOneMain(description.inputs) || !isOneMain(description.outputs)) return undefined;
	const versions = Array.isArray(description.version) ? description.version : [description.version];
	const typeVersion =
		options.typeVersion !== undefined && versions.includes(options.typeVersion)
			? options.typeVersion
			: Math.max(...versions);
	const [derived] = deriveManifests({ ...description, version: typeVersion }, options);
	const actions = (derived?.actions ?? []).filter((action) => action.shape !== 'multiSelector');
	return actions.length > 0 ? { typeVersion, actions } : undefined;
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
	const [issue] = validate(input, action.contract.input, { allowExpressions: true });
	return issue === undefined ? { action, input } : { reason: issue };
}
