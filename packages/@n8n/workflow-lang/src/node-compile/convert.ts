import { compile } from '../compiler/index.ts';
import { CREDENTIAL_FLAGS_PREFIX } from '../credentials/flags.ts';
import { displayParameter, getNodeParameters } from '../convert/node-parameters.ts';
import type { PublicCredential } from '../credentials/public.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import type {
	CredentialDerivation,
	CredentialMint,
	EvaluatedText,
	ParameterKind,
	PublishFacts,
	RandomShape,
	UnitOrigin,
} from './specialise.ts';
import { hasExecuteMethod, isRoutedDescription, routedEntry } from './routing.ts';
import { hasExpression, OWNED_REQUEST, specialiseNode } from './specialise.ts';
import type { FieldCheck, ParameterValidation } from './validate.ts';
import { VERIFIED } from './verified.generated.ts';

export interface NodeSources {
	entry: (type: string, version: number) => string | undefined;
	readFile: (path: string) => string | undefined;

	description: (type: string, version: number) => NodeDescription | undefined;

	aliases?: Record<string, string>;

	verified?: Record<string, string[]>;

	publicCredential?: (type: string, id: string | null) => PublicCredential | undefined;

	evaluate?: (code: string) => unknown;

	credentialEntry?: (type: string) => string | undefined;

	storesResponses?: boolean;

	runsInHost?: (nodeName: string) => boolean;
}

export function verifiedKey(
	type: string,
	version: number,
	parameters: Record<string, unknown>,
): string {
	const text = (v: unknown) => (typeof v === 'string' ? v : '');
	return `${type}@${version}:${text(parameters.resource)}.${text(parameters.operation)}`;
}

export const AUTHENTICATION_PREFIX = '@auth=';

export function authenticationCondition(authentication: string, condition: string): string {
	return `${AUTHENTICATION_PREFIX}${authentication}:${condition}`;
}

export function verifiedNames(
	sources: NodeSources,
	type: string,
	version: number,
	resolved: Record<string, unknown>,
): string[] | undefined {
	const all = (sources.verified ?? VERIFIED)[verifiedKey(type, version, resolved)];
	if (all === undefined) return undefined;
	const start =
		typeof resolved.authentication === 'string'
			? authenticationCondition(resolved.authentication, '')
			: undefined;
	const own: string[] = [];
	const shared: string[] = [];
	for (const name of all) {
		if (start !== undefined && name.startsWith(start)) own.push(name.slice(start.length));
		else if (!name.startsWith(AUTHENTICATION_PREFIX)) shared.push(name);
	}
	return own.length > 0 ? own : shared;
}

export const UNVERIFIED_OPERATION = '(operation)';
export const UNVERIFIED_FLAGS = '@credentialFlags';

export function unverifiedConditions(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): string[] {
	const names = verifiedNames(sources, type, version, compiled.resolved);
	if (names === undefined) return [UNVERIFIED_OPERATION];
	const properties = sources.description(type, version)?.properties ?? [];
	const isCollection = (name: string) =>
		properties.some(
			(p) => p.name === name && (p.type === 'collection' || p.type === 'fixedCollection'),
		);
	const missing: string[] = [];
	const need = (condition: string) => {
		if (!names.includes(condition)) missing.push(condition);
	};
	const check = (
		name: string,
		conditionOf: (path: string) => string,
		only: (member: unknown) => boolean,
	) => {
		const value = compiled.resolved[name];
		const members =
			isCollection(name) && isRecord(value)
				? Object.keys(value).filter((key) => only(value[key]))
				: [];
		if (members.length === 0) need(conditionOf(name));
		for (const key of members) need(conditionOf(`${name}.${key}`));
	};
	for (const name of compiled.changed)
		check(
			name,
			(path) => path,
			() => true,
		);
	for (const name of itemParameterNames(compiled))
		check(name, (path) => itemParameterCondition(path, compiled.errorMode), hasExpression);
	for (const name of evaluatedParameterNames(compiled))
		need(evaluatedCondition(name, compiled.errorMode));
	if (compiled.flags.length > 0 && verifiedFlagKeys(sources, type, version, compiled).length === 0)
		missing.push(UNVERIFIED_FLAGS);
	return missing;
}

export function isVerified(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	return unverifiedConditions(sources, type, version, compiled).length === 0;
}

export function verifiedFlagKeys(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): string[] {
	const names = verifiedNames(sources, type, version, compiled.resolved);
	const wanted = compiled.flags
		.map((flag) => flag.name)
		.sort()
		.join(',');
	const flagsOf = (key: string) =>
		key
			.slice(CREDENTIAL_FLAGS_PREFIX.length)
			.split(',')
			.map((part) => part.slice(0, part.indexOf(':')))
			.join(',');
	return (names ?? []).filter(
		(name) => name.startsWith(CREDENTIAL_FLAGS_PREFIX) && flagsOf(name) === wanted,
	);
}

export function flagGuard(
	compiled: CompiledNode,
	allowed: string[],
	node: string,
): CredentialDerivation {
	const flags = compiled.flags.map((flag) => flag.name).sort();
	return {
		name: `g${hashOf(JSON.stringify([flags, [...allowed].sort(), node]))}`,
		code: '',
		kind: 'guard',
		flags,
		allowed: [...allowed].sort(),
		node,
	};
}

export type ErrorMode = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

export const CONTINUE_MODES: ErrorMode[] = ['continueRegularOutput', 'continueErrorOutput'];

export const ERROR_ITEMS_BY_POSITION = '@errorItems=position';

export const CALL_FOR_EACH_ITEM = '@items=each';

export const ITEM_PARAMETER_PREFIX = '@each=';

export const ONE_CALL_PREFIX = '@oneCall=';

export const PAIRED_ITEMS = '@pairedItems';

export function itemParameterCondition(name: string, mode: ErrorMode = 'stopWorkflow'): string {
	return mode === 'stopWorkflow'
		? `${ITEM_PARAMETER_PREFIX}${name}`
		: `${ITEM_PARAMETER_PREFIX}${name}@${mode}`;
}

export const EVALUATED_PARAMETER_PREFIX = '@evaluated=';

export function evaluatedCondition(name: string, mode: ErrorMode = 'stopWorkflow'): string {
	return mode === 'stopWorkflow'
		? `${EVALUATED_PARAMETER_PREFIX}${name}`
		: `${EVALUATED_PARAMETER_PREFIX}${name}@${mode}`;
}

export function evaluatedParameterNames(compiled: CompiledNode): string[] {
	return [
		...new Set(
			compiled.evaluated.flatMap((entry) =>
				entry.parameter === undefined ? [] : [entry.parameter.split('.')[0]],
			),
		),
	].sort();
}

export const ITEM_ERROR = '@eachError';

export function itemErrorCondition(mode: ErrorMode = 'stopWorkflow'): string {
	return mode === 'stopWorkflow' ? ITEM_ERROR : `${ITEM_ERROR}@${mode}`;
}

export function deferredVerified(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	if (compiled.deferred.length === 0) return true;
	const names = verifiedNames(sources, type, version, compiled.resolved);
	return names?.includes(itemErrorCondition(compiled.errorMode)) === true;
}

export function oneCallCondition(mode: ErrorMode): string {
	return `${ONE_CALL_PREFIX}${mode}`;
}

export function callsOnce(
	sources: NodeSources,
	type: string,
	version: number,
	resolved: Record<string, unknown>,
	mode: ErrorMode,
): boolean {
	if (mode === 'stopWorkflow') return true;
	const names = verifiedNames(sources, type, version, resolved);
	return names?.includes(oneCallCondition(mode)) === true;
}

export function pairsAsV1(
	sources: NodeSources,
	type: string,
	version: number,
	resolved: Record<string, unknown>,
): boolean {
	const names = verifiedNames(sources, type, version, resolved);
	return names?.includes(PAIRED_ITEMS) === true;
}

export function itemParameterNames(compiled: CompiledNode): string[] {
	return [...new Set(compiled.itemParameters.map((path) => path.split('.')[0]))].sort();
}

export function valueAtPath(parameters: Record<string, unknown>, path: string): unknown {
	let value: unknown = parameters;
	for (const key of path.split('.')) value = isRecord(value) ? value[key] : undefined;
	return value;
}

export function agreesForEachItem(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = verifiedNames(sources, type, version, compiled.resolved);
	return names?.includes(CALL_FOR_EACH_ITEM) === true;
}

export function errorItemsByPosition(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = verifiedNames(sources, type, version, compiled.resolved);
	return names?.includes(ERROR_ITEMS_BY_POSITION) === true;
}

export function errorModeCondition(mode: ErrorMode): string[] {
	return mode === 'stopWorkflow' ? [] : [`@onError=${mode}`];
}

export function nodeDescriptionOf(value: unknown): NodeDescription | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const name: unknown = Reflect.get(value, 'name');
	const properties: unknown = Reflect.get(value, 'properties');
	if (typeof name !== 'string' || !Array.isArray(properties)) return undefined;
	const description: NodeDescription = { name, properties };
	for (const key of ['requestDefaults', 'requestOperations', 'credentials']) {
		const member: unknown = Reflect.get(value, key);
		if (member !== undefined) Reflect.set(description, key, member);
	}
	return description;
}

function hashOf(text: string): string {
	let h = 0x811c9dc5;
	for (let k = 0; k < text.length; k++) {
		h ^= text.charCodeAt(k);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

const MAX_ACCEPTED = 4096;

const accepted = new Map<string, string[]>();

function subsetErrors(type: string, version: number, source: string): string[] {
	const known = accepted.get(source);
	if (known) return known;
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'check' })],
	async run(ctx) {
		return await ctx.node({ name: 'Node', type: ${JSON.stringify(type)}, typeVersion: ${version}, parameters: {} });
	},
});
`;
	let errors: string[];
	try {
		const result = compile(workflow, { nodes: { 'nodes/compiled-check.ts': source } });
		errors = result.diagnostics.map((d) => `${d.code}: ${d.message}`);
	} catch (error) {
		errors = [error instanceof Error ? error.message : String(error)];
	}

	if (accepted.size >= MAX_ACCEPTED) accepted.clear();
	accepted.set(source, errors);
	return errors;
}

export interface CompiledNode {
	type: string;
	file: string;
	source: string;

	dynamic: string[];

	itemParameters: string[];

	evaluated: EvaluatedText[];

	firstItemParameters: string[];

	deferred: string[];

	errorMode: ErrorMode;

	pairedOutput: boolean;

	resolved: Record<string, unknown>;

	derivations: CredentialDerivation[];

	flags: CredentialDerivation[];

	mints: CredentialMint[];

	randoms: RandomShape[];
	binary: boolean;

	storesResponses: boolean;

	marksFileLimit: boolean;

	changed: string[];

	zones: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindOf(property: unknown): ParameterKind | undefined {
	if (!isRecord(property) || typeof property.type !== 'string') return undefined;
	const kind: ParameterKind = { type: property.type, extract: Boolean(property.extractValue) };
	if (property.type === 'resourceMapper') {
		const options = isRecord(property.typeOptions)
			? property.typeOptions.resourceMapper
			: undefined;
		const mapper = isRecord(options) ? options : {};
		return {
			...kind,
			mapper: {
				adds: mapper.mode === 'add',
				conversions: Boolean(mapper.showTypeConversionOptions),
			},
		};
	}
	if (property.type !== 'resourceLocator') return kind;
	if (!Array.isArray(property.modes)) return undefined;
	const modes: NonNullable<ParameterKind['modes']> = {};
	for (const mode of property.modes) {
		if (!isRecord(mode) || typeof mode.name !== 'string' || mode.name in modes) return undefined;
		const rule = mode.extractValue;
		if (!rule) {
			modes[mode.name] = null;
			continue;
		}
		if (!isRecord(rule) || rule.type !== 'regex') return undefined;
		if (typeof rule.regex === 'string') modes[mode.name] = { pattern: rule.regex, flags: '' };
		else if (rule.regex instanceof RegExp)
			modes[mode.name] = { pattern: rule.regex.source, flags: rule.regex.flags };
		else return undefined;
	}
	return {
		...kind,
		modes,
		...(typeof property.displayName === 'string' ? { label: property.displayName } : {}),
	};
}

export function parameterKindOf(
	description: NodeDescription,
	name: string,
): ParameterKind | undefined {
	const kinds = description.properties.filter((p) => p.name === name).map(kindOf);
	const first = kinds[0];
	if (first === undefined) return undefined;
	const text = JSON.stringify(first);
	if (kinds.every((kind) => kind !== undefined && JSON.stringify(kind) === text)) return first;
	const mappers = kinds.flatMap((kind) => (kind?.mapper ? [kind.mapper] : []));
	if (mappers.length !== kinds.length || kinds.some((kind) => kind?.extract !== first.extract))
		return undefined;
	return {
		type: first.type,
		extract: first.extract,
		mapper: {
			adds: mappers.some((mapper) => mapper.adds),
			conversions: mappers.some((mapper) => mapper.conversions),
		},
	};
}

function fieldCheckOf(property: unknown): FieldCheck | undefined {
	if (!isRecord(property) || property.ignoreValidationDuringExecution) return undefined;
	if (typeof property.validateType !== 'string' || property.validateType === '') return undefined;
	const choices =
		property.validateType === 'options' && Array.isArray(property.options)
			? property.options.map((option: unknown) => (isRecord(option) ? option.value : undefined))
			: undefined;
	return {
		type: property.validateType,
		label: String(property.displayName),
		...(choices === undefined ? {} : { options: choices }),
	};
}

function memberChecksOf(members: unknown): Record<string, FieldCheck> {
	const checks: Record<string, FieldCheck> = {};
	for (const member of Array.isArray(members) ? members : []) {
		const check = fieldCheckOf(member);
		if (check !== undefined && isRecord(member) && typeof member.name === 'string')
			checks[member.name] = check;
	}
	return checks;
}

export function parameterValidationOf(
	description: NodeDescription,
	parameters: Record<string, unknown>,
	version: number,
	name: string,
): ParameterValidation | undefined {
	const shown: unknown = description.properties.find(
		(property) =>
			property.name === name &&
			displayParameter(parameters, property, version, description, parameters),
	);
	if (!isRecord(shown) || typeof shown.type !== 'string') return undefined;
	const rule: ParameterValidation = { type: shown.type, label: String(shown.displayName) };
	const own = fieldCheckOf(shown);
	if (own !== undefined) rule.own = own;
	if (shown.type === 'collection') rule.members = memberChecksOf(shown.options);
	if (shown.type === 'fixedCollection') {
		rule.groups = {};
		for (const group of Array.isArray(shown.options) ? shown.options : []) {
			if (!isRecord(group) || typeof group.name !== 'string') continue;
			if (!Object.hasOwn(rule.groups, group.name))
				rule.groups[group.name] = memberChecksOf(group.values);
		}
	}
	if (shown.type === 'resourceMapper') {
		const options = isRecord(shown.typeOptions) ? shown.typeOptions.resourceMapper : undefined;
		const mapper = isRecord(options) ? options : {};
		rule.mapper = {
			adds: mapper.mode === 'add',
			conversions: Boolean(mapper.showTypeConversionOptions),
			strings: Boolean(mapper.alwaysConvertFieldsToString),
		};
	}
	return rule;
}

export function compileNodeInstance(
	sources: NodeSources,
	node: { type: string; version: number; parameters: Record<string, unknown> },
	instanceId: string | null | undefined,

	credentials: Record<string, PublicCredential> = {},
	timezone?: string,
	facts?: PublishFacts,
	errorMode: ErrorMode = 'stopWorkflow',
	deferred: string[] = [],
	pairedOutput = false,
): CompiledNode | { errors: string[]; origins?: UnitOrigin[] } {
	const entry = sources.entry(node.type, node.version);
	const description = sources.description(node.type, node.version);
	if (entry === undefined || description === undefined) {
		return { errors: ['the source or the description of the node is not there'] };
	}
	let parameters: Record<string, unknown>;
	try {
		parameters =
			getNodeParameters(
				description.properties,
				node.parameters,
				true,
				false,
				node.version,
				description,
			) ?? {};
	} catch (error) {
		return { errors: [error instanceof Error ? error.message : String(error)] };
	}

	let changed: string[];
	try {
		const defaults =
			getNodeParameters(
				description.properties,
				{ resource: parameters.resource, operation: parameters.operation },
				true,
				false,
				node.version,
				description,
			) ?? {};
		changed = Object.keys(parameters).filter(
			(name) =>
				name !== 'resource' &&
				name !== 'operation' &&
				JSON.stringify(parameters[name]) !== JSON.stringify(defaults[name]),
		);
	} catch (error) {
		return { errors: [error instanceof Error ? error.message : String(error)] };
	}
	const entryText = sources.readFile(entry);
	const routed =
		isRoutedDescription(description) && entryText !== undefined && !hasExecuteMethod(entryText)
			? routedEntry({
					description,
					parameters,
					version: node.version,
					entry,
					readFile: sources.readFile,
					credentialFields: (type) =>
						Object.hasOwn(credentials, type) ? credentials[type].fields : undefined,
				})
			: undefined;
	if (routed !== undefined && 'errors' in routed) return routed;
	const input = {
		type: node.type,
		version: node.version,
		entry: routed?.entry ?? entry,
		readFile: routed?.readFile ?? sources.readFile,
		parameters,
		aliases: sources.aliases,
		parameterKind: (name: string) => parameterKindOf(description, name),
		validation: (name: string) =>
			parameterValidationOf(description, parameters, node.version, name),
		evaluate: sources.evaluate,
		credentialEntry: sources.credentialEntry,
		timezone,
		instanceId,
		facts,
		continueOnFail: errorMode !== 'stopWorkflow',
		deferredParameters: deferred,
		pairedOutput,
		credentialFields: Object.fromEntries(
			Object.entries(credentials).map(([type, c]) => [type, c.fields]),
		),
		ownHost: routed?.ownHost,
	};
	const result = specialiseNode(input);
	if (result.source === undefined || result.retyped === undefined)
		return { errors: [...(routed?.refusals ?? []), ...result.errors], origins: result.origins };
	if (routed?.ownHost !== undefined) {
		const requests = result.source.match(/ctx\.http\(/g)?.length ?? 0;
		const owned = result.source.match(OWNED_REQUEST)?.length ?? 0;
		if (owned === 0 || owned !== requests)
			return {
				errors: [
					'the routing of the node stays in the host: a request of the node does not name the host of the node for the allowed domains of the credential',
				],
			};
	}

	const evaluated = result.evaluated ?? [];
	const isEvaluated = (path: string) => evaluated.some((entry) => entry.path === path);
	const type = `${node.type}#${hashOf(result.source)}`;
	const source = result.retyped(type);
	const errors = subsetErrors(type, node.version, source);
	if (errors.length > 0) return { errors };
	return {
		type,
		file: `nodes/compiled-${type.slice(type.indexOf('#') + 1)}.ts`,
		source,
		dynamic: Object.keys(parameters).filter((name) => hasExpression(parameters[name])),
		itemParameters: (result.itemParameters ?? []).filter((path) => !isEvaluated(path)),
		evaluated,
		firstItemParameters: result.firstItemParameters ?? [],
		deferred: (result.itemParameters ?? []).filter((path) => deferred.includes(path)),
		errorMode,
		pairedOutput,
		resolved: parameters,
		derivations: (result.derivations ?? []).filter((d) => d.kind === undefined),
		flags: (result.derivations ?? []).filter((d) => d.kind === 'flag'),
		mints: result.mints ?? [],
		zones: result.zones ?? [],
		randoms: result.randoms ?? [],
		binary: result.binary === true,
		storesResponses: result.storesResponses === true,
		marksFileLimit: result.marksFileLimit === true,

		changed: [
			...changed,
			...Object.values(credentials).flatMap((c) => c.classes),
			...errorModeCondition(errorMode),
		],
	};
}
