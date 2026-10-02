/**
 * Derive: one derived manifest per (node type, typeVersion, resource, operation) of a legacy
 * `INodeTypeDescription`. The legacy node still executes. The manifest types the input, and an
 * identity compile map takes it back to legacy parameters.
 */
import {
	NodeHelpers,
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
	type NodeParameterValue,
	type NodeParameterValueType,
} from 'n8n-workflow';

import type { JsonSchema } from '@n8n/node-sdk';
import { canonicalJson, type ContractDocument, type DerivedManifest } from '@n8n/node-sdk/registry';

export interface LegacyTarget {
	readonly type: string;
	readonly typeVersion: number;
	readonly resource?: string;
	readonly operation?: string;
}

/** `resourceLocator` fields drop `__rl: true` in the manifest. Compile adds it back. */
export type CompileKind = 'identity' | 'resourceLocator';

export interface CompileMap {
	readonly target: LegacyTarget;
	/** Manifest field to legacy parameter path. Derive keeps the legacy names. */
	readonly fields: Readonly<Record<string, { readonly path: string; readonly kind: CompileKind }>>;
	/** The variant tag. Decompile keeps it when it holds the default, so the variant stays explicit. */
	readonly selector?: string;
}

/**
 * `multiSelector`: more than one selector changes the shown fields. The first one picks the
 * variant, and in each variant the fields of the others are optional.
 */
export type DeriveShape = 'flat' | 'variants' | 'multiSelector';

export type DeriveIssueKind =
	| 'loadOptions'
	| 'resourceLocator'
	| 'collection'
	| 'fixedCollection'
	| 'conditionalDefault'
	| 'expressionDefault'
	| 'multiSelector'
	| 'opaque';

export interface DeriveIssue {
	readonly kind: DeriveIssueKind;
	readonly field: string;
	readonly detail: string;
}

/** Leaf counts. `nested` counts the leaves inside a collection or a fixed collection. */
export interface FieldCounts {
	readonly top: number;
	readonly nested: number;
	readonly typed: number;
	readonly loose: number;
	readonly opaque: number;
}

export interface DerivedAction {
	readonly contract: DerivedManifest;
	readonly compile: CompileMap;
	readonly shape: DeriveShape;
	readonly issues: readonly DeriveIssue[];
	readonly counts: FieldCounts;
}

export type OutputSchemaLookup = (target: LegacyTarget) => JsonSchema | undefined;

export interface DeriveOptions {
	/** The package prefix of the legacy node type, e.g. `n8n-nodes-base`. */
	readonly packageName: string;
	readonly outputSchema?: OutputSchemaLookup;
}

// A derived action does not know its effect. `write` is the safe claim for safety-gated features.
const UNKNOWN_FLOW: ContractDocument['flow'] = {
	effect: 'write',
	cardinality: 'per-item',
	passthrough: 'replace',
};

// These types hold no user input that the legacy node reads from the manifest.
const NOT_INPUT: ReadonlySet<string> = new Set([
	'notice',
	'callout',
	'button',
	'curlImport',
	'credentials',
	'hidden',
]);

const ZERO: FieldCounts = { top: 0, nested: 0, typed: 0, loose: 0, opaque: 0 };

const sumCounts = (counts: readonly FieldCounts[]): FieldCounts =>
	counts.reduce(
		(total, next) => ({
			top: total.top + next.top,
			nested: total.nested + next.nested,
			typed: total.typed + next.typed,
			loose: total.loose + next.loose,
			opaque: total.opaque + next.opaque,
		}),
		ZERO,
	);

const leavesOf = (counts: FieldCounts) => counts.typed + counts.loose + counts.opaque;

interface FieldLift {
	readonly schema: JsonSchema;
	readonly counts: FieldCounts;
	readonly issues: readonly DeriveIssue[];
	readonly kind: CompileKind;
}

type NamedLift = readonly [string, FieldLift];

const named = (name: string, lift: FieldLift): NamedLift => [name, lift];

interface Context {
	readonly description: INodeTypeDescription;
	readonly node: { readonly typeVersion: number };
	/** `resource` and `operation` when they select the action. They are not manifest fields. */
	readonly discriminators: ReadonlySet<string>;
}

const parametersFor = (context: Context, values: INodeParameters): INodeParameters =>
	NodeHelpers.getNodeParameters(
		context.description.properties,
		values,
		true,
		false,
		context.node,
		context.description,
	) ?? {};

const shownProperty = (context: Context, name: string, values: INodeParameters) =>
	context.description.properties.find(
		(property) =>
			property.name === name &&
			NodeHelpers.displayParameter(values, property, context.node, context.description),
	);

const isEmpty = (value: unknown) =>
	value === undefined ||
	value === null ||
	value === '' ||
	(typeof value === 'object' && Object.keys(value).length === 0);

/** The first sentence of the legacy description, when it fits a hint budget of 80 characters. */
function docOf(property: INodeProperties): string | undefined {
	const text = (property.description ?? '').replace(/<[^>]+>/g, '').trim();
	const sentence = text.split(/(?<=\.)\s/)[0] ?? '';
	return sentence && sentence.length <= 80 ? sentence : undefined;
}

const isDynamic = (property: INodeProperties) =>
	Boolean(
		property.typeOptions?.loadOptionsMethod ??
			property.typeOptions?.loadOptions ??
			property.typeOptions?.loadOptionsDependsOn,
	);

const leaf = (
	schema: JsonSchema,
	kind: 'typed' | 'loose' | 'opaque',
	issues: readonly DeriveIssue[] = [],
): FieldLift => ({ schema, counts: { ...ZERO, [kind]: 1 }, issues, kind: 'identity' });

const objectOf = (
	fields: readonly NamedLift[],
	required: readonly string[] = [],
	extra: Record<string, JsonSchema> = {},
): JsonSchema => {
	const requiredNames = [...Object.keys(extra), ...required];
	return {
		type: 'object',
		properties: {
			...extra,
			...Object.fromEntries(fields.map(([name, lift]) => [name, lift.schema])),
		},
		...(requiredNames.length > 0 ? { required: requiredNames } : {}),
		additionalProperties: false,
	};
};

/**
 * Legacy descriptions repeat a name with other `displayOptions`, so the value takes any of the
 * shapes. Counts come from the first definition, so a repeated name is one field.
 */
function mergeLifts(lifts: readonly FieldLift[]): FieldLift {
	const schemas = [
		...new Map(lifts.map((lift) => [canonicalJson(lift.schema), lift.schema])).values(),
	];
	const [first] = lifts;
	return {
		schema: schemas.length === 1 ? (schemas[0] ?? {}) : { anyOf: schemas },
		counts: first?.counts ?? ZERO,
		issues: lifts.flatMap((lift) => lift.issues),
		kind: first?.kind ?? 'identity',
	};
}

/** A container of child fields: a collection, or one group of a fixed collection. */
function containerOf(
	children: readonly INodeProperties[],
	path: string,
	issueKind: 'collection' | 'fixedCollection',
): FieldLift {
	const all = children.flatMap((child) => {
		const lift = fieldLift(child, `${path}.${child.name}`, true);
		return lift ? [named(child.name, lift)] : [];
	});
	const lifts = [...new Set(all.map(([name]) => name))].map((name) =>
		named(name, mergeLifts(all.filter(([other]) => other === name).map(([, lift]) => lift))),
	);
	const conditional = children.filter((child) => child.displayOptions).map((child) => child.name);
	const counts = sumCounts(lifts.map(([, lift]) => lift.counts));
	return {
		schema: objectOf(lifts),
		counts: { ...counts, nested: leavesOf(counts) },
		issues: [
			...lifts.flatMap(([, lift]) => lift.issues),
			...(conditional.length > 0
				? [
						{
							kind: issueKind,
							field: path,
							detail: `conditional sub-fields are flat optionals: ${conditional.join(', ')}`,
						},
					]
				: []),
		],
		kind: 'identity',
	};
}

const arrayOf = (lift: FieldLift): FieldLift => ({
	...lift,
	schema: { type: 'array', items: lift.schema },
});

function locatorLift(property: INodeProperties, path: string, nested: boolean): FieldLift {
	const modes = property.modes ?? [];
	const listModes = modes.filter((mode) => mode.type === 'list').map((mode) => mode.name);
	// A nested locator is not in the compile map, so it keeps the legacy flag.
	const flag: Record<string, JsonSchema> = nested
		? { __rl: { const: true, 'x-n8n-literal': true } }
		: {};
	const schema: JsonSchema = {
		type: 'object',
		discriminator: { propertyName: 'mode' },
		oneOf: modes.map((mode) => ({
			type: 'object',
			properties: {
				...flag,
				mode: { const: mode.name, 'x-n8n-literal': true },
				value: { type: 'string' },
			},
			required: [...Object.keys(flag), 'mode', 'value'],
		})),
	};
	const issue = (detail: string): DeriveIssue => ({ kind: 'resourceLocator', field: path, detail });
	const issues = [
		...(listModes.length > 0 ? [issue('list mode needs a search call')] : []),
		...(modes.length === 0 ? [issue('no modes declared')] : []),
	];
	const typed = modes.some((mode) => mode.type !== 'list');
	return {
		...leaf(schema, typed ? 'typed' : 'loose', issues),
		kind: nested ? 'identity' : 'resourceLocator',
	};
}

function optionsLift(property: INodeProperties, path: string, base: JsonSchema): FieldLift {
	const values: readonly NodeParameterValue[] = isINodePropertyOptionsList(property.options)
		? property.options.map((option) => option.value)
		: [];
	// Dynamic lists return strings or numbers. A list without options takes an ID by expression.
	if (isDynamic(property) || values.length === 0) {
		const value: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'number' }] };
		return leaf({ ...base, ...value, 'x-n8n-hint': 'Dynamic list value' }, 'loose', [
			{
				kind: 'loadOptions',
				field: path,
				detail:
					property.typeOptions?.loadOptionsMethod ??
					(isDynamic(property) ? 'routing loadOptions' : 'no options'),
			},
		]);
	}
	return leaf({ ...base, enum: values }, 'typed');
}

function fieldLift(property: INodeProperties, path: string, nested = false): FieldLift | undefined {
	if (NOT_INPUT.has(property.type)) return undefined;
	const doc = docOf(property);
	const base: JsonSchema = {
		...(doc ? { description: doc } : {}),
		...(isEmpty(property.default) ? {} : { default: property.default }),
	};
	const lift = ((): FieldLift => {
		switch (property.type) {
			case 'string':
			case 'color':
			case 'credentialsSelect':
				return leaf({ ...base, type: 'string' }, 'typed');
			case 'dateTime':
				return leaf({ ...base, type: 'string', format: 'date-time' }, 'typed');
			case 'json':
				return leaf({ ...base, type: 'string', 'x-n8n-hint': 'JSON text' }, 'typed');
			case 'number':
				return leaf(
					{
						...base,
						type: 'number',
						...(property.typeOptions?.minValue !== undefined
							? { minimum: property.typeOptions.minValue }
							: {}),
						...(property.typeOptions?.maxValue !== undefined
							? { maximum: property.typeOptions.maxValue }
							: {}),
					},
					'typed',
				);
			case 'boolean':
				return leaf({ ...base, type: 'boolean' }, 'typed');
			case 'options':
				return optionsLift(property, path, base);
			case 'multiOptions':
				return arrayOf(optionsLift(property, path, base));
			case 'collection': {
				const children = isINodePropertiesList(property.options) ? property.options : [];
				return containerOf(children, path, 'collection');
			}
			case 'fixedCollection': {
				const groups = isINodePropertyCollectionList(property.options) ? property.options : [];
				const lifts = groups.map((group) => {
					const container = containerOf(group.values, `${path}.${group.name}`, 'fixedCollection');
					return named(
						group.name,
						property.typeOptions?.multipleValues ? arrayOf(container) : container,
					);
				});
				const counts = sumCounts(lifts.map(([, groupLift]) => groupLift.counts));
				return {
					schema: objectOf(lifts),
					counts: { ...counts, nested: leavesOf(counts) },
					issues: lifts.flatMap(([, groupLift]) => groupLift.issues),
					kind: 'identity',
				};
			}
			case 'resourceLocator':
				return locatorLift(property, path, nested);
			default:
				return leaf({ ...base, 'x-n8n-hint': `Legacy ${property.type} value` }, 'opaque', [
					{ kind: 'opaque', field: path, detail: property.type },
				]);
		}
	})();
	const expressionDefault: DeriveIssue[] =
		typeof property.default === 'string' && property.default.startsWith('=')
			? [{ kind: 'expressionDefault', field: path, detail: property.default }]
			: [];
	const multiple =
		property.typeOptions?.multipleValues &&
		property.type !== 'fixedCollection' &&
		property.type !== 'multiOptions';
	const shaped = multiple ? arrayOf(lift) : lift;
	return { ...shaped, issues: [...shaped.issues, ...expressionDefault] };
}

/** The legacy field names that this parameter set shows, without the discriminators. */
const fieldNames = (context: Context, values: INodeParameters) =>
	Object.keys(values).filter((name) => {
		const property = shownProperty(context, name, values);
		return (
			!context.discriminators.has(name) && property !== undefined && !NOT_INPUT.has(property.type)
		);
	});

/** Shown fields and the definition each one resolves to; duplicate names can differ. */
const shapeKey = (context: Context, values: INodeParameters) =>
	fieldNames(context, values)
		.map((name) => {
			const property = shownProperty(context, name, values);
			return `${name}#${property ? context.description.properties.indexOf(property) : -1}`;
		})
		.join(',');

const liftField = (context: Context, name: string, values: INodeParameters) => {
	const property = shownProperty(context, name, values);
	const lift = property ? fieldLift(property, name) : undefined;
	return property && lift ? { property, lift } : undefined;
};

/** Names that a `displayOptions` rule reads, so a change of their value can show other fields. */
const controlNames = (properties: readonly INodeProperties[]): ReadonlySet<string> =>
	new Set(
		properties.flatMap((property) =>
			[
				...Object.keys(property.displayOptions?.show ?? {}),
				...Object.keys(property.displayOptions?.hide ?? {}),
			].map((name) => name.replace(/^\//, '')),
		),
	);

function selectorValues(property: INodeProperties): readonly NodeParameterValue[] {
	if (property.type === 'boolean') return [true, false];
	if (property.type !== 'options' || isDynamic(property)) return [];
	return isINodePropertyOptionsList(property.options)
		? property.options.map((option) => option.value)
		: [];
}

interface Branch {
	readonly value: NodeParameterValue;
	readonly values: INodeParameters;
}

interface Selector {
	readonly name: string;
	readonly branches: readonly Branch[];
}

/** Selectors shown in `values` that change the shown fields. `fixed` names are not selectors. */
function selectorsOf(context: Context, fixed: INodeParameters, values: INodeParameters) {
	const controls = controlNames(context.description.properties);
	return fieldNames(context, values).flatMap((name): Selector[] => {
		const property = shownProperty(context, name, values);
		if (!property || !controls.has(name) || name in fixed) return [];
		const branches = selectorValues(property).map(
			(value): Branch => ({ value, values: parametersFor(context, { ...fixed, [name]: value }) }),
		);
		const shapes = new Set(branches.map((branch) => shapeKey(context, branch.values)));
		return shapes.size > 1 ? [{ name, branches }] : [];
	});
}

/** A non-empty value for a free-text control, so fields shown only when it is set appear. */
function probeOf(property: INodeProperties): NodeParameterValueType | undefined {
	if (property.type === 'resourceLocator') {
		const mode =
			property.modes?.find((candidate) => candidate.type !== 'list') ?? property.modes?.[0];
		return mode ? { __rl: true, mode: mode.name, value: 'probe' } : undefined;
	}
	if (property.type === 'number') return 1;
	if (property.type === 'string' || (property.type === 'options' && isDynamic(property))) {
		return 'probe';
	}
	return undefined;
}

/** Parameter sets where one free-text control holds a value. They never become variants. */
function probesOf(context: Context, fixed: INodeParameters, values: INodeParameters) {
	const controls = controlNames(context.description.properties);
	return fieldNames(context, values).flatMap((name) => {
		const property = shownProperty(context, name, values);
		const probe =
			property && controls.has(name) && !(name in fixed) ? probeOf(property) : undefined;
		return probe === undefined ? [] : [{ ...fixed, [name]: probe }];
	});
}

// Deep enough for `sendBody` > `specifyBody` > body fields, and it bounds the fan-out.
const SELECTOR_DEPTH = 3;

/** The parameter sets reachable from `fixed` through nested selectors. */
function valueSetsOf(context: Context, fixed: INodeParameters, depth: number): INodeParameters[] {
	const values = parametersFor(context, fixed);
	if (depth === 0) return [values];
	return [
		values,
		...selectorsOf(context, fixed, values).flatMap((selector) =>
			selector.branches.flatMap((branch) =>
				valueSetsOf(context, { ...fixed, [selector.name]: branch.value }, depth - 1),
			),
		),
		...probesOf(context, fixed, values).flatMap((probed) =>
			valueSetsOf(context, probed, depth - 1),
		),
	];
}

const dedupeIssues = (issues: readonly DeriveIssue[]) => [
	...new Map(issues.map((issue) => [`${issue.kind} ${issue.field}`, issue])).values(),
];

interface InputLift {
	readonly schema: JsonSchema;
	readonly fields: readonly NamedLift[];
	readonly issues: readonly DeriveIssue[];
	readonly shape: DeriveShape;
	readonly selector?: string;
}

// n8n fills a default, so a field with a default is optional in the manifest.
const isRequired = (property: INodeProperties) =>
	property.required === true && isEmpty(property.default);

interface FieldsLift {
	readonly fields: readonly NamedLift[];
	readonly required: readonly string[];
	readonly issues: readonly DeriveIssue[];
}

/**
 * The fields of all `valueSets`. A field is required only when the first set shows it, so a
 * field that a nested selector shows stays optional.
 */
function fieldsOf(
	context: Context,
	valueSets: readonly INodeParameters[],
	omit: ReadonlySet<string>,
): FieldsLift {
	const shown = valueSets.map((values) => ({
		values,
		names: fieldNames(context, values).filter((name) => !omit.has(name)),
	}));
	const baseFields = new Set(shown[0]?.names ?? []);
	const resolved = [...new Set(shown.flatMap(({ names }) => names))].map((name) => ({
		name,
		lifts: shown.flatMap(({ values, names }) => {
			const field = names.includes(name) ? liftField(context, name, values) : undefined;
			return field ? [field] : [];
		}),
	}));
	const fields = resolved.flatMap(({ name, lifts }) =>
		lifts.length > 0 ? [named(name, mergeLifts(lifts.map(({ lift }) => lift)))] : [],
	);
	const conflicts = resolved
		.filter(({ lifts }) => new Set(lifts.map(({ lift }) => canonicalJson(lift.schema))).size > 1)
		.map(
			({ name }): DeriveIssue => ({
				kind: 'conditionalDefault',
				field: name,
				detail: 'type or default depends on another field',
			}),
		);
	return {
		fields,
		required: resolved
			.filter(
				({ name, lifts }) => baseFields.has(name) && lifts[0] && isRequired(lifts[0].property),
			)
			.map(({ name }) => name),
		issues: [...fields.flatMap(([, lift]) => lift.issues), ...conflicts],
	};
}

/** n8n fills the default of the selector, so the variant of the default needs no tag. */
function variantInput(context: Context, fixed: INodeParameters, selector: Selector): InputLift {
	const selected = parametersFor(context, fixed)[selector.name];
	const branches = selector.branches.map((branch) => {
		const lifted = fieldsOf(
			context,
			valueSetsOf(context, { ...fixed, [selector.name]: branch.value }, SELECTOR_DEPTH - 1),
			new Set([selector.name]),
		);
		const tag: JsonSchema = { const: branch.value, 'x-n8n-literal': true };
		const schema = objectOf(lifted.fields, lifted.required, { [selector.name]: tag });
		return {
			lifted,
			schema:
				branch.value === selected
					? { ...schema, required: schema.required?.filter((name) => name !== selector.name) }
					: schema,
		};
	});
	const all = branches.flatMap((branch) => branch.lifted.fields);
	return {
		schema: {
			type: 'object',
			discriminator: { propertyName: selector.name },
			oneOf: branches.map((branch) => branch.schema),
		},
		fields: [...new Map(all).entries()],
		issues: branches.flatMap((branch) => branch.lifted.issues),
		shape: 'variants',
		selector: selector.name,
	};
}

function inputOf(context: Context, discriminators: INodeParameters): InputLift {
	const base = parametersFor(context, discriminators);
	const selectors = selectorsOf(context, discriminators, base);
	const [first, ...others] = selectors;
	if (first === undefined) {
		const lifted = fieldsOf(
			context,
			valueSetsOf(context, discriminators, SELECTOR_DEPTH),
			new Set<string>(),
		);
		return {
			schema: objectOf(lifted.fields, lifted.required),
			fields: lifted.fields,
			issues: lifted.issues,
			shape: 'flat',
		};
	}
	const variants = variantInput(context, discriminators, first);
	if (others.length === 0) return variants;
	return {
		...variants,
		shape: 'multiSelector',
		issues: [
			...variants.issues,
			{
				kind: 'multiSelector',
				field: selectors.map((selector) => selector.name).join('+'),
				detail: `${selectors.length} selectors change the shown fields: ${first.name} picks the variant, and the fields of the others are optional`,
			},
		],
	};
}

interface ActionKey {
	readonly resource?: string;
	readonly operation?: string;
	readonly summary: string;
}

const stringOptions = (context: Context, property: INodeProperties, values: INodeParameters) =>
	isINodePropertyOptionsList(property.options)
		? property.options.filter(
				(option) =>
					typeof option.value === 'string' &&
					NodeHelpers.displayParameter(values, option, context.node, context.description),
			)
		: [];

const summaryOf = (text: string) => (text.length <= 120 ? text : `${text.slice(0, 117)}...`);

/** Static options of a shown `resource` or `operation`. Other shapes stay plain fields. */
const discriminatorOptions = (context: Context, name: string, values: INodeParameters) => {
	const property = shownProperty(context, name, values);
	return property?.type === 'options' && !isDynamic(property)
		? stringOptions(context, property, values)
		: [];
};

function actionKeys(context: Context): ActionKey[] {
	const defaults = parametersFor(context, {});
	const resourceOptions = discriminatorOptions(context, 'resource', defaults);
	const resources =
		resourceOptions.length > 0
			? resourceOptions.map((option) => String(option.value))
			: [undefined];
	return resources.flatMap((resource): ActionKey[] => {
		const values = parametersFor(context, resource === undefined ? {} : { resource });
		const operations = discriminatorOptions(context, 'operation', values);
		if (operations.length === 0) {
			return [{ resource, summary: summaryOf(context.description.description) }];
		}
		return operations.map((option) => ({
			resource,
			operation: String(option.value),
			summary: summaryOf(option.action ?? option.description ?? option.name),
		}));
	});
}

const entry = (field: string, kind: CompileKind): [string, { path: string; kind: CompileKind }] => [
	field,
	{ path: field, kind },
];

const semverOf = (typeVersion: number) => {
	const [major = '0', minor = '0'] = String(typeVersion).split('.');
	return `${major}.${minor}.0`;
};

function deriveAction(
	versionContext: Context,
	key: ActionKey,
	options: DeriveOptions,
	type: string,
): DerivedAction {
	const discriminators: INodeParameters = {
		...(key.resource !== undefined ? { resource: key.resource } : {}),
		...(key.operation !== undefined ? { operation: key.operation } : {}),
	};
	const context: Context = {
		...versionContext,
		discriminators: new Set(Object.keys(discriminators)),
	};
	const target: LegacyTarget = {
		type,
		typeVersion: context.node.typeVersion,
		...(key.resource !== undefined ? { resource: key.resource } : {}),
		...(key.operation !== undefined ? { operation: key.operation } : {}),
	};
	const input = inputOf(context, discriminators);
	const base = parametersFor(context, discriminators);
	const credentials = (context.description.credentials ?? [])
		.filter((credential) =>
			NodeHelpers.displayParameter(base, credential, context.node, context.description),
		)
		.map((credential) => credential.name);
	const output = options.outputSchema?.(target);
	const name = context.description.name;
	const id = [name, key.resource, key.operation ?? (key.resource ? undefined : 'execute')]
		.filter((part) => part !== undefined)
		.join('.');
	const counts = sumCounts(input.fields.map(([, lift]) => lift.counts));
	return {
		contract: {
			id,
			version: Math.floor(context.node.typeVersion),
			node: name,
			action: key.operation ?? name,
			summary: key.summary,
			flow: UNKNOWN_FLOW,
			credentials,
			input: input.schema,
			output: output ?? {},
			derived: true,
			semver: semverOf(context.node.typeVersion),
			outputClaim: output ? 'inferred' : 'unknown',
		},
		compile: {
			target,
			fields: Object.fromEntries([
				...(input.selector ? [entry(input.selector, 'identity')] : []),
				...input.fields.map(([field, lift]) => entry(field, lift.kind)),
			]),
			...(input.selector ? { selector: input.selector } : {}),
		},
		shape: input.shape,
		issues: dedupeIssues(input.issues),
		counts: { ...counts, top: input.fields.length + (input.selector ? 1 : 0) },
	};
}

export interface DerivedVersion {
	readonly typeVersion: number;
	readonly actions: readonly DerivedAction[];
}

/** The derived manifests of every typeVersion of a legacy node description. */
export function deriveManifests(
	description: INodeTypeDescription,
	options: DeriveOptions,
): DerivedVersion[] {
	const versions = Array.isArray(description.version) ? description.version : [description.version];
	const type = `${options.packageName}.${description.name}`;
	return versions.map((typeVersion) => {
		const context: Context = { description, node: { typeVersion }, discriminators: new Set() };
		return {
			typeVersion,
			actions: actionKeys(context).map((key) => deriveAction(context, key, options, type)),
		};
	});
}

const SCHEMA_TYPES: ReadonlySet<string> = new Set([
	'string',
	'number',
	'integer',
	'boolean',
	'object',
	'array',
	'null',
]);

const isSchemaType = (value: unknown): value is NonNullable<JsonSchema['type']> =>
	typeof value === 'string' && SCHEMA_TYPES.has(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The JSON Schema subset of a `__schema__` file. Unknown keywords are dropped. */
export function outputSchemaFrom(raw: unknown): JsonSchema {
	if (!isRecord(raw)) return {};
	const { type, properties, items, required } = raw;
	return {
		...(isSchemaType(type) ? { type } : {}),
		...(isRecord(properties)
			? {
					properties: Object.fromEntries(
						Object.entries(properties).map(([name, child]) => [name, outputSchemaFrom(child)]),
					),
				}
			: {}),
		...(isRecord(items) ? { items: outputSchemaFrom(items) } : {}),
		...(Array.isArray(required)
			? { required: required.filter((name): name is string => typeof name === 'string') }
			: {}),
	};
}
