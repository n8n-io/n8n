import {
	inputCountOf,
	isToolContract,
	replyContractOf,
	toContract,
	usesBinary,
	type ActionOutputs,
	type ContractDocument,
	type Trigger,
} from './define';
import { permissionsOf } from './egress';
import { hasBinary, type EntryFields as EntryFieldsSpec, type JsonSchema } from './schema';
import { providedOf } from './providers';
import { exampleOf } from './validate';

const pascal = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const typeName = (id: string) => id.split('.').map(pascal).join('');
const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
const doc = (text: string | undefined, indent: string) =>
	text ? `${indent}/** ${text.replace(/\*\//g, '*\\/')} */\n` : '';
const docOf = (schema: JsonSchema) => schema['x-n8n-hint'] ?? schema.description;

/** A local type that replaces a type text used more than once in a module. */
interface Alias {
	/** The local type name. */
	readonly name: string;
	/** True when the type takes the item and context parameters. */
	readonly generic: boolean;
}

interface Mode {
	/** Wrap leaves in `Value<I, C, T>` so they accept a lambda. */
	input: boolean;
	/** Input leaves take plain values: a trigger has no item to read. */
	plain?: boolean;
	/** An optional output field prints as optional, so a read of it needs a check. */
	optionalOutputs?: boolean;
	/** An optional output field also takes `null`: the host passes response drift on. */
	nullableOutputs?: boolean;
	/** The indent of the current line. */
	indent: string;
	/** Print short objects without docs on one line. The agent reads every byte of a module. */
	compact?: boolean;
	/** Local types by `shapeKey`. */
	aliases?: ReadonlyMap<string, Alias>;
	/** `name: doc` pairs that an earlier action of the module shows. */
	hiddenDocs?: ReadonlySet<string>;
}

/** Objects at most this long print on one line in compact mode. */
const ONE_LINE_MAX = 80;

/** `${type}` in a template literal type. */
const typeSlot = (type: string) => `\${${type}}`;

/** `^property_[a-z0-9_]+$` → `property_${Lowercase<string>}`; `^x_` → `x_${string}`. */
function patternKey(pattern: string): string {
	// The keys of `t.indexedBinaries()`, with or without a fixed prefix.
	const indexed = /^\^([\w-]*|\.\*)\\d\+\$$/.exec(pattern)?.[1];
	if (indexed !== undefined) {
		return `\`${indexed === '.*' ? typeSlot('string') : indexed}${typeSlot('number')}\``;
	}
	const lower = /^\^([\w-]+)\[a-z0-9_\]\+\$$/.exec(pattern)?.[1];
	if (lower) return `\`${lower}\${Lowercase<string>}\``;
	const prefix = /^\^([\w-]+)$/.exec(pattern.replace(/\.\*$/, ''))?.[1];
	return prefix ? `\`${prefix}\${string}\`` : 'string';
}

/**
 * The doc of an open key space, as the agent reads it: the hint of the pattern schema tells
 * how a key is made, and the value types of the object tell the value of each source type.
 */
function patternDoc(schema: JsonSchema, child: JsonSchema, mode: Mode, indent: string): string {
	const keys = docOf(child);
	const types = schema['x-n8n-value-types'];
	if (!types) return doc(keys, indent);
	const lines = Object.entries(types).map(([name, valueType]) => {
		const hint = valueType['x-n8n-hint'] ? ` (${valueType['x-n8n-hint']})` : '';
		const text = toTs(valueType, { input: false, indent: '', compact: mode.compact });
		return `${indent} * - ${name}: ${text.replace(/\s+/g, ' ')}${hint}`;
	});
	const keyLine = keys ? `${indent} * ${keys.replace(/\*\//g, '*\\/')}\n` : '';
	return `${indent}/**\n${keyLine}${indent} * Value by property type:\n${lines.join('\n')}\n${indent} */\n`;
}

/** A value in an open input object. Unlike `unknown`, it keeps a lambda typed. */
const OPEN_VALUE = 'OpenValue';

function leaf(text: string, schema: JsonSchema, mode: Mode): string {
	return mode.input && !mode.plain && !schema['x-n8n-literal'] ? `Value<I, C, ${text}>` : text;
}

interface Tag {
	readonly name: string;
	readonly values: string;
	/** A variant whose tag holds the default can leave the tag out. */
	readonly optional?: boolean;
}

/** `hiddenDocs` holds `name: doc` pairs that an earlier branch of the same union shows. */
function objectTs(
	schema: JsonSchema,
	mode: Mode,
	tag?: Tag,
	hiddenDocs: ReadonlySet<string> = new Set(),
): string {
	const inner = `${mode.indent}\t`;
	const childMode = { ...mode, indent: inner };
	const required = new Set(schema.required ?? []);
	const properties = Object.entries(schema.properties ?? {}).filter(([name]) => name !== tag?.name);
	const shownDoc = (name: string, child: JsonSchema) => {
		const text = docOf(child);
		const docKey = `${name}: ${text}`;
		return text && !hiddenDocs.has(docKey) && !mode.hiddenDocs?.has(docKey) ? text : undefined;
	};
	const fieldTs = (name: string, child: JsonSchema) => {
		const text = toTs(child, childMode);
		if (required.has(name) || mode.input)
			return `${key(name)}${required.has(name) ? '' : '?'}: ${text}`;
		if (!mode.optionalOutputs) return `${key(name)}: ${text}`;
		const takesNull = mode.nullableOutputs && !child['x-n8n-binary'] && !/\| null$/.test(text);
		return `${key(name)}?: ${text}${takesNull ? ' | null' : ''}`;
	};
	const members = [
		...(tag
			? [{ doc: '', body: `${key(tag.name)}${tag.optional ? '?' : ''}: ${tag.values}` }]
			: []),
		...properties.map(([name, child]) => ({
			doc: doc(shownDoc(name, child), inner),
			body: fieldTs(name, child),
		})),
		...Object.entries(schema.patternProperties ?? {}).map(([pattern, child]) => ({
			doc: patternDoc(schema, child, mode, inner),
			body: `[key: ${patternKey(pattern)}]: ${toTs(child, childMode)}`,
		})),
	];
	const { additionalProperties } = schema;
	if (typeof additionalProperties === 'object') {
		// tsc checks an optional field against the index type, and its value can be undefined.
		const optional = properties.some(
			([name]) => !required.has(name) && (mode.input || mode.optionalOutputs),
		);
		members.push({
			doc: '',
			body: `[key: string]: ${toTs(additionalProperties, childMode)}${optional ? ' | undefined' : ''}`,
		});
	} else if (additionalProperties === true || (additionalProperties === undefined && !mode.input)) {
		// Open shape: reads compile, so missing type information never blocks a build.
		members.push({ doc: '', body: '[key: string]: any' });
	}
	if (!members.length) return 'Record<string, never>';
	const oneLine = `{ ${members.map(({ body }) => body).join('; ')} }`;
	const fitsOneLine =
		mode.compact &&
		oneLine.length <= ONE_LINE_MAX &&
		members.every(({ doc: text, body }) => !text && !body.includes('\n'));
	if (fitsOneLine) return oneLine;
	const lines = members.map(({ doc: text, body }) => `${text}${inner}${body};`);
	return `{\n${lines.join('\n')}\n${mode.indent}}`;
}

/**
 * A tagged union with branches that differ only in the tag collapses to one object per
 * distinct shape (`op: "equals" | "contains"; value: …`), which keeps agent views small.
 */
function variantGroups(schema: JsonSchema, branches: readonly JsonSchema[], mode: Mode) {
	const name = schema.discriminator?.propertyName ?? '';
	const groups = new Map<string, { branch: JsonSchema; tags: unknown[]; optional: boolean }>();
	for (const branch of branches) {
		const rest = objectTs(branch, mode, { name, values: '' });
		const group = groups.get(rest);
		const tagValue = branch.properties?.[name]?.const;
		const optional = !(branch.required ?? []).includes(name);
		if (group) {
			group.tags.push(tagValue);
			group.optional ||= optional;
		} else groups.set(rest, { branch, tags: [tagValue], optional });
	}
	return { name, groups: [...groups.values()] };
}

const docKeys = (schema: JsonSchema) =>
	Object.entries(schema.properties ?? {}).flatMap(([name, child]) => {
		const text = docOf(child);
		return text ? [`${name}: ${text}`] : [];
	});

/** The doc keys of a schema and of all its sub-schemas. */
const allDocKeys = (schema: JsonSchema): string[] => [
	...docKeys(schema),
	...[
		...Object.values(schema.properties ?? {}),
		...(schema.oneOf ?? schema.anyOf ?? []),
		...(schema.items ? [schema.items] : []),
		...Object.values(schema.patternProperties ?? {}),
		...(typeof schema.additionalProperties === 'object' ? [schema.additionalProperties] : []),
	].flatMap(allDocKeys),
];

/** A field doc that repeats across branches shows on the first branch only. */
function variantTs(schema: JsonSchema, branches: readonly JsonSchema[], mode: Mode): string {
	const { name, groups } = variantGroups(schema, branches, mode);
	const [first, ...rest] = groups.map(({ branch }) => branch);
	const member = (branch: JsonSchema, field: string) => {
		const child = branch.properties?.[field];
		return child && `${branch.required?.includes(field)} ${docOf(child)} ${shapeOf(child, mode)}`;
	};
	// A field that every branch has with the same type prints once, beside the union.
	const shared = new Set(
		first && rest.length
			? Object.keys(first.properties ?? {}).filter(
					(field) =>
						field !== name &&
						rest.every((branch) => member(branch, field) === member(first, field)),
				)
			: [],
	);
	const pick = (branch: JsonSchema, keep: boolean): JsonSchema => ({
		...branch,
		properties: Object.fromEntries(
			Object.entries(branch.properties ?? {}).filter(([field]) => shared.has(field) === keep),
		),
	});
	const union = groups
		.map(({ branch, tags, optional }, index) =>
			objectTs(
				pick(branch, false),
				mode,
				{ name, values: tags.map((t) => JSON.stringify(t)).join(' | '), optional },
				new Set(groups.slice(0, index).flatMap((group) => docKeys(group.branch))),
			),
		)
		.join(' | ');
	if (!first || !shared.size) return union;
	const common = objectTs({ ...pick(first, true), additionalProperties: false }, mode);
	return `${common} & (${union})`;
}

function renderTs(schema: JsonSchema, mode: Mode): string {
	// The host takes a binary of the item, never a value that the workflow writes.
	if (schema['x-n8n-binary']) return mode.input ? '((item: I, $: Dollar<C>) => Binary)' : 'Binary';
	// A provider of the kind, never a value: n8n connects it to the root node.
	const supply = schema['x-n8n-supply'];
	// A provider made before the call has unknown items, so it must not type the root's items.
	// A trigger has no item, so it takes a provider of any item.
	if (supply !== undefined) {
		const items = mode.plain ? 'never, never' : 'NoInfer<I>, NoInfer<C>';
		// The host gives a contract tool to a LangChain root node as a LangChain tool.
		const kinds = supply === 'ai_tool' ? '"ai_tool" | "tool"' : JSON.stringify(supply);
		return `Provider<${items}, ${kinds}>`;
	}
	// A value of each response page: a lambda over the page, never over the item.
	const page = schema['x-n8n-page'];
	if (page !== undefined && mode.input) {
		return `PageValue<${toTs(page, { input: false, indent: '', compact: true })}>`;
	}
	// Outputs keep `string`: a model ID that the provider gives back is not checked.
	const catalog = schema['x-n8n-model-catalog'];
	if (catalog !== undefined && schema.type === 'string' && mode.input) {
		return leaf(`ModelOf<${JSON.stringify(catalog)}>`, schema, mode);
	}
	if (schema.const !== undefined) return JSON.stringify(schema.const);
	if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
	if (schema.discriminator && schema.oneOf) return variantTs(schema, schema.oneOf, mode);
	const union = schema.oneOf ?? schema.anyOf;
	if (union) return union.map((option) => toTs(option, mode)).join(' | ');
	switch (schema.type) {
		case 'string':
			return leaf('string', schema, mode);
		case 'number':
		case 'integer':
			return leaf('number', schema, mode);
		case 'boolean':
			return leaf('boolean', schema, mode);
		case 'null':
			return 'null';
		case 'array':
			return `Array<${schema.items ? toTs(schema.items, mode) : 'any'}>`;
		case 'object':
			// Until the workflow declares it, a declared field reads like an open shape, so a
			// decompiled flow without its schema still compiles.
			if (schema['x-n8n-declared'] && !mode.input) return '{ [key: string]: any }';
			if (schema.additionalProperties === true && !schema.properties) {
				// Each key takes a lambda too. `Record<string, unknown>` gives it no parameter types.
				return mode.input && !mode.plain && !schema['x-n8n-literal']
					? `Value<I, C, { [key: string]: Value<I, C, ${OPEN_VALUE}> }>`
					: 'Record<string, unknown>';
			}
			return objectTs(schema, mode);
		default:
			return schema.properties ? objectTs(schema, mode) : 'any';
	}
}

/** Only objects and unions can take a local type name. */
const isStructural = (schema: JsonSchema) =>
	schema.const === undefined &&
	!schema.enum &&
	Boolean(
		schema.properties ??
			schema.patternProperties ??
			schema.oneOf ??
			schema.anyOf ??
			(typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined),
	);

/** The type text of a schema at indent '', without local type names. */
const shapeOf = (schema: JsonSchema, mode: Mode) =>
	renderTs(schema, { input: mode.input, indent: '', compact: mode.compact });

/** Input and output types never share a local type: only input types take `<I, C>`. */
const shapeKey = (schema: JsonSchema, mode: Mode) =>
	`${mode.input ? 'input' : 'output'} ${shapeOf(schema, mode)}`;

const aliasRef = ({ name, generic }: Alias) => (generic ? `${name}<I, C>` : name);

/** JSON Schema as TypeScript type text. */
export function toTs(schema: JsonSchema, mode: Mode): string {
	const alias =
		mode.aliases && isStructural(schema) ? mode.aliases.get(shapeKey(schema, mode)) : undefined;
	return alias ? aliasRef(alias) : renderTs(schema, mode);
}

/** `true | false`, or `one per cases entry, then fallback`. */
const outputsText = (outputs: ActionOutputs) =>
	'each' in outputs
		? `one per ${outputs.each} entry, named by its output${outputs.then?.length ? `, then ${outputs.then.join(' | ')}` : ''}`
		: outputs.join(' | ');

/** The paths of the binary fields of an input. `*` is each entry of a list or a record. */
function binaryPathsOf(schema: JsonSchema): string[][] {
	if (schema['x-n8n-binary']) return [[]];
	const children: Array<[string, JsonSchema]> = [
		...Object.entries(schema.properties ?? {}),
		...Object.values(schema.patternProperties ?? {}).map((child): [string, JsonSchema] => [
			'*',
			child,
		]),
		...(schema.items ? [['*', schema.items] satisfies [string, JsonSchema]] : []),
		...(typeof schema.additionalProperties === 'object'
			? [['*', schema.additionalProperties] satisfies [string, JsonSchema]]
			: []),
	];
	const paths = [
		...children.flatMap(([key, child]) => binaryPathsOf(child).map((path) => [key, ...path])),
		...[...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].flatMap(binaryPathsOf),
	];
	return [...new Map(paths.map((path) => [JSON.stringify(path), path])).values()];
}

/**
 * The output as a workflow item: a binary field or binary key pattern moves from the JSON to
 * `binary`, also in each `t.union()` branch.
 */
export function outputItemSchema(output: JsonSchema): JsonSchema {
	const fields = Object.entries(output.properties ?? {});
	const patterns = Object.entries(output.patternProperties ?? {});
	const isBinary = ([, field]: [string, JsonSchema]) => field['x-n8n-binary'] === true;
	const binaries = new Set(fields.filter(isBinary).map(([name]) => name));
	const binaryPatterns = patterns.filter(isBinary);
	const branches = output.anyOf?.map(outputItemSchema);
	const withBranches = branches ? { ...output, anyOf: branches } : output;
	if (binaries.size === 0 && binaryPatterns.length === 0) return withBranches;
	const required = output.required ?? [];
	const otherPatterns = patterns.filter((entry) => !isBinary(entry));
	const { patternProperties: _patterns, ...rest } = withBranches;
	return {
		...rest,
		...(otherPatterns.length > 0 ? { patternProperties: Object.fromEntries(otherPatterns) } : {}),
		properties: {
			...Object.fromEntries(fields.filter(([name]) => !binaries.has(name))),
			binary: {
				type: 'object',
				properties: Object.fromEntries(fields.filter(([name]) => binaries.has(name))),
				...(binaryPatterns.length > 0
					? { patternProperties: Object.fromEntries(binaryPatterns) }
					: {}),
				required: required.filter((name) => binaries.has(name)),
				additionalProperties: false,
			},
		},
		// Required, so a lambda can name an indexed key: the build compiles it to the key.
		required: [...required.filter((name) => !binaries.has(name)), 'binary'],
	};
}

/** One factory of a generated node module: the contract it types and the node it emits. */
export interface GeneratedAction {
	/** The contract document that types the factory. */
	readonly contract: ContractDocument;
	/** The factory path in the module: `notion.databasePage.getAll(...)`. */
	readonly resource?: string;
	/** The factory name, e.g. `getAll`. */
	readonly operation: string;
	/** The n8n node type, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll` or `n8n-nodes-base.notion`. */
	readonly nodeType: string;
	/**
	 * The slot of a composed or derived node version that runs the action, e.g. Notion v4
	 * `databasePage.getAll`. A derived node can select its action by an operation alone.
	 */
	readonly slot?: {
		/** The node version of the slot, e.g. `4`. */
		readonly typeVersion: number;
		/** The `resource` parameter value of the slot. */
		readonly resource?: string;
		/** The `operation` parameter value of the slot. */
		readonly operation?: string;
	};
	/** The node version the factory emits when it is not the contract major: a native node. */
	readonly typeVersion?: number;
	/** The native trigger and reply step pair that the flow build checks. */
	readonly pairing?: Pairing;
}

/**
 * A native trigger and its reply step. The caller waits for the reply when `field` is `value`.
 * Without `field`, the reply step always belongs to the trigger, e.g. a form page.
 */
export interface Pairing {
	/** The node type of the trigger, e.g. `n8n-nodes-base.webhook`. */
	readonly trigger: string;
	/** The node type of the reply step, e.g. `n8n-nodes-base.respondToWebhook`. */
	readonly reply: string;
	/** The trigger field that makes the caller wait, e.g. `responseMode`. */
	readonly field?: string;
	/** The value of `field` that makes the caller wait, e.g. `responseNode`. */
	readonly value?: string;
}

/**
 * The factories of a trigger: the trigger, and the reply step of a native trigger. A native
 * trigger emits its legacy node; another trigger emits `nodeType`.
 */
export function generatedTriggersOf(trigger: Trigger, nodeType: string): GeneratedAction[] {
	const { resource } = trigger;
	const contract = toContract(trigger);
	if (trigger.kind !== 'native') {
		return [{ contract, nodeType, resource, operation: trigger.operation }];
	}
	const { native, reply } = trigger;
	const replyContract = replyContractOf(trigger);
	const pairing = reply && {
		trigger: native.type,
		reply: reply.native.type,
		...(reply.awaits ? { field: reply.awaits.field, value: reply.awaits.value } : {}),
	};
	const own = { contract, nodeType: native.type, typeVersion: native.version, resource };
	return [
		{ ...own, operation: trigger.operation, ...(pairing ? { pairing } : {}) },
		...(reply && replyContract && pairing
			? [
					{
						contract: replyContract,
						nodeType: reply.native.type,
						typeVersion: reply.native.version,
						resource,
						operation: reply.operation,
						pairing,
					},
				]
			: []),
	];
}

/** The schema without its optional fields, at any depth. */
const requiredOf = (schema: JsonSchema): JsonSchema => ({
	...schema,
	...(schema.properties
		? {
				properties: Object.fromEntries(
					Object.entries(schema.properties).flatMap(([key, field]) =>
						schema.required?.includes(key) ? [[key, requiredOf(field)]] : [],
					),
				),
			}
		: {}),
	...(schema.items ? { items: requiredOf(schema.items) } : {}),
});

/**
 * An example of the JSON of an output item with only its required fields, so a filled sample
 * gets no field that the sample leaves out on purpose. Binary fields go to `binary`, not the JSON.
 */
const jsonExampleOf = (output: JsonSchema) =>
	exampleOf(
		requiredOf({
			...output,
			properties: Object.fromEntries(
				Object.entries(output.properties ?? {}).filter(([, field]) => !field['x-n8n-binary']),
			),
		}),
	);

/** The `EntryFields` type of a trigger output, over the config `C`. */
function entryFieldsTs(entries: EntryFieldsSpec): string {
	const output: Mode = { input: false, indent: '', compact: true };
	const types = Object.entries(entries.types)
		.map(([name, schema]) => `${key(name)}: ${toTs(schema, output)}`)
		.join('; ');
	return `EntryFields<C, ${JSON.stringify(entries.list)}, ${JSON.stringify(entries.key)}, ${JSON.stringify(entries.type)}, { ${types} }, ${toTs(entries.fallback, output)}${entries.required ? `, ${JSON.stringify(entries.required)}` : ''}>`;
}

/** The top-level output fields whose JSON Schema the workflow declares. */
const declaredFieldsOf = (output: JsonSchema) =>
	Object.entries(output.properties ?? {}).flatMap(([name, field]) =>
		field['x-n8n-declared'] ? [name] : [],
	);

const scopesNote = (contract: ContractDocument) => {
	const { scopes } = permissionsOf(contract);
	return scopes?.length ? `; scopes: ${scopes.join(', ')}` : '';
};

/** The hosts the action may reach; the credential hosts also apply. */
const egressNote = (contract: ContractDocument) => {
	const { egress } = permissionsOf(contract);
	const hosts = [
		...egress.hosts,
		...egress.templates,
		...(egress.fromInput === undefined ? [] : [`the host of ${egress.fromInput}`]),
	];
	return hosts.length ? `; hosts: ${hosts.join(', ')}` : '';
};

/** The reply step of a native trigger, and when its caller waits for it. */
const replyNote = (pairing: Pairing | undefined, side: 'trigger' | 'reply') => {
	if (pairing === undefined) return '';
	if (pairing.field !== undefined) return `; reply when ${pairing.field} is ${pairing.value}`;
	return side === 'reply' ? `; needs a ${pairing.trigger} trigger before it` : '';
};

/** What the flow build reads to compute the scopes of a workflow, e.g. `{ credential: "notion", scopes: [...] }`. */
const requiresOf = ({ node, scopes }: ContractDocument) =>
	scopes?.length ? JSON.stringify({ credential: node, scopes }) : undefined;

/** The credential of the node, as the agent reads it: its types and the scopes in use. */
function credentialLines(nodeId: string, contracts: readonly GeneratedAction[]): string[] {
	const types = [...new Set(contracts.flatMap(({ contract }) => contract.credentials))];
	if (types.length === 0) return [];
	const scopes = [...new Set(contracts.flatMap(({ contract }) => contract.scopes ?? []))];
	return [
		`// Credential "${nodeId}": one of ${types.join(', ')}.${scopes.length ? ` A workflow needs the scopes its nodes list: ${scopes.join(', ')}.` : ''}`,
	];
}

interface Factory {
	readonly path: string[];
	readonly summary: string;
	readonly text: string;
}

function nest(entries: readonly Factory[], indent: string): string {
	const groups = new Map<string, Factory[]>();
	for (const entry of entries) {
		const [head = '', ...rest] = entry.path;
		groups.set(head, [...(groups.get(head) ?? []), { ...entry, path: rest }]);
	}
	const inner = `${indent}\t`;
	const members = [...groups].map(([name, children]) => {
		const leafEntry = children.find((child) => child.path.length === 0);
		return leafEntry
			? `${doc(leafEntry.summary, inner)}${inner}${key(name)}: ${leafEntry.text.replace(/\n/g, `\n${inner}`)},`
			: `${inner}${key(name)}: ${nest(children, inner)},`;
	});
	return `{\n${members.join('\n')}\n${indent}}`;
}

/** Sub-schemas in print order, each with the local type name it takes. */
function subSchemas(schema: JsonSchema, mode: Mode, owner: string, name: string) {
	if (schema.const !== undefined || schema.enum) return [];
	const named = (properties: Record<string, JsonSchema> = {}): Array<[string, JsonSchema]> =>
		Object.entries(properties).map(([field, child]) => [`${owner}${pascal(field)}`, child]);
	if (schema.discriminator && schema.oneOf) {
		return variantGroups(schema, schema.oneOf, mode).groups.flatMap(({ branch }) =>
			named(branch.properties),
		);
	}
	const { additionalProperties } = schema;
	const same = [
		...(schema.oneOf ?? schema.anyOf ?? []),
		...(schema.items ? [schema.items] : []),
		...Object.values(schema.patternProperties ?? {}),
		...(typeof additionalProperties === 'object' ? [additionalProperties] : []),
	].map((child): [string, JsonSchema] => [name, child]);
	return [...named(schema.properties), ...same];
}

interface Shape {
	readonly schema: JsonSchema;
	readonly text: string;
	readonly input: boolean;
	readonly owner: string;
	readonly name: string;
	/** The whole input or output of an action; its export type is the local type. */
	readonly root: boolean;
	readonly count: number;
}

/** Counts each type text. The repeats of a type do not count what they contain. */
function countShapes(
	shapes: Map<string, Shape>,
	schema: JsonSchema,
	mode: Mode,
	owner: string,
	name: string,
	root = false,
) {
	if (isStructural(schema)) {
		const text = shapeOf(schema, mode);
		const shapeId = shapeKey(schema, mode);
		const known = shapes.get(shapeId);
		shapes.set(shapeId, {
			...(known ?? { schema, text, input: mode.input, owner, name, root }),
			count: (known?.count ?? 0) + 1,
		});
		if (known) return;
	}
	for (const [childName, child] of subSchemas(schema, mode, owner, name)) {
		countShapes(shapes, child, mode, owner, childName);
	}
}

// A provider field reads the item types too: `Provider<NoInfer<I>, NoInfer<C>, …>`.
const isGeneric = ({ input, root, text }: Shape) =>
	input && (root || text.includes('Value<I, C,') || text.includes('NoInfer<I>'));

/** A local type pays off when its references and definition are shorter than the copies. */
function pays(shape: Shape) {
	const { count, root, text } = shape;
	const ref = aliasRef({ name: shape.name, generic: isGeneric(shape) }).length;
	const definition = root ? 0 : ref + text.length + 10;
	return count * text.length > definition + count * ref;
}

const freeName = (base: string, taken: ReadonlySet<string>) =>
	[base, ...Array.from({ length: taken.size + 1 }, (_, i) => `${base}${i + 2}`)].find(
		(candidate) => !taken.has(candidate),
	) ?? base;

/**
 * The paths of the `t.pageValue()` fields of an input, e.g. `[["pages", "next"]]`. The typed flow
 * compiles a lambda there over the page (`$response`), not over the item.
 */
function pageFieldsOf(schema: JsonSchema, at: readonly string[] = []): string[][] {
	if (schema['x-n8n-page']) return [[...at]];
	const found = [
		...Object.entries(schema.properties ?? {}).flatMap(([name, child]) =>
			pageFieldsOf(child, [...at, name]),
		),
		...(schema.oneOf ?? schema.anyOf ?? []).flatMap((branch) => pageFieldsOf(branch, at)),
	];
	return [...new Map(found.map((path) => [JSON.stringify(path), path])).values()];
}

/** `, a, b` without trailing `undefined`s. Version 1 alone is the default, so it is left out. */
function trailingArgs(args: readonly string[]): string {
	const kept = args.slice(
		0,
		args.length - [...args].reverse().findIndex((arg) => arg !== 'undefined'),
	);
	return kept.length === 1 && kept[0] === '1' ? '' : kept.map((arg) => `, ${arg}`).join('');
}

/**
 * The TypeScript module for one node's actions. The agent reads this text, and `tsc` checks
 * the workflow against it, so what the agent sees is exactly what is enforced.
 */
export function generateNodeModule(nodeId: string, contracts: readonly GeneratedAction[]): string {
	const input: Mode = { input: true, indent: '', compact: true };
	// An action output marks its optional fields, and they take null: the host passes drift on.
	const output: Mode = {
		input: false,
		indent: '',
		compact: true,
		optionalOutputs: true,
		nullableOutputs: true,
	};
	// An action with named or counted inputs joins branches, so a flow region builds it, not a step.
	const actions = contracts.filter(({ contract }) => !contract.trigger && !contract.inputs);
	const inputsText = (contract: ContractDocument) => {
		const counted = inputCountOf(contract);
		return counted
			? `${counted.min} to ${counted.max}, set by ${counted.field}`
			: contract.inputs && !('count' in contract.inputs)
				? contract.inputs.join(', ')
				: '';
	};
	const joins = contracts
		.filter(({ contract }) => contract.inputs)
		.map(
			({ contract }) =>
				`// ${contract.id}: ${contract.action}. ${contract.summary} (inputs: ${inputsText(contract)}). A flow region with branches builds it.`,
		);
	const triggers = contracts.filter(({ contract }) => contract.trigger);
	const named = actions.map((action) => ({
		...action,
		contract: { ...action.contract, output: outputItemSchema(action.contract.output) },
		name: typeName(action.contract.id),
	}));
	const roots = named.flatMap(({ name }) => [`${name}Input`, `${name}Output`]);

	const shapes = new Map<string, Shape>();
	for (const { contract, name } of named) {
		countShapes(shapes, contract.input, input, name, `${name}Input`, true);
		countShapes(shapes, contract.output, output, name, `${name}Output`, true);
	}
	const hoisted = [...shapes].filter(([, shape]) => shape.count > 1 && pays(shape));
	const names = hoisted.reduce<string[]>(
		(taken, [, shape]) => [
			...taken,
			shape.root ? shape.name : freeName(shape.name, new Set([...roots, ...taken])),
		],
		[],
	);
	const aliases = new Map(
		hoisted.map(([shapeId, shape], index): [string, Alias] => [
			shapeId,
			{ name: names[index] ?? shape.name, generic: isGeneric(shape) },
		]),
	);
	const withAliases = (mode: Mode): Mode => ({ ...mode, aliases });

	/** The root text itself when this root defines the local type, else the reference. */
	const rootTs = (schema: JsonSchema, mode: Mode, exportName: string) =>
		aliases.get(shapeKey(schema, mode))?.name === exportName
			? renderTs(schema, withAliases(mode))
			: toTs(schema, withAliases(mode));

	// A field doc that an earlier action shows is not repeated.
	const types = named.map(({ contract, name }, index) => {
		const earlier = named.slice(0, index).map((action) => action.contract);
		const actionInput = {
			...input,
			hiddenDocs: new Set(earlier.flatMap((action) => allDocKeys(action.input))),
		};
		const actionOutput = {
			...output,
			hiddenDocs: new Set(earlier.flatMap((action) => allDocKeys(action.output))),
		};
		const locals = hoisted.flatMap(([shapeId, shape]) => {
			const alias = aliases.get(shapeId);
			if (shape.owner !== name || shape.root || !alias) return [];
			const params = alias.generic ? '<I, C>' : '';
			const mode = withAliases(shape.input ? actionInput : actionOutput);
			return [`type ${alias.name}${params} = ${renderTs(shape.schema, mode)};`];
		});
		// An action without input takes only a name; `Record<string, never>` would make it `never`.
		const inputTs = rootTs(contract.input, actionInput, `${name}Input`);
		return [
			inputTs === 'Record<string, never>'
				? `export type ${name}Input<_I, _C> = Record<never, never>;`
				: `export type ${name}Input<I, C> = ${inputTs};`,
			...(providedOf(contract.output)
				? []
				: [
						`export type ${name}Output = ${rootTs(contract.output, actionOutput, `${name}Output`)};`,
					]),
			...(contract.output['x-n8n-entry-fields']
				? [
						`export type ${name}Fields<C> = ${entryFieldsTs(contract.output['x-n8n-entry-fields'])};`,
					]
				: []),
			...locals,
		].join('\n');
	});
	const factories = named.map(
		({ contract, name, nodeType, slot, resource, operation, typeVersion, pairing }): Factory => {
			const path = resource === undefined ? [operation] : [resource, operation];
			const provided = providedOf(contract.output);
			if (provided) {
				const nodeVersion = slot?.typeVersion ?? typeVersion ?? contract.version;
				const selected =
					slot && `, ${JSON.stringify({ resource: slot.resource, operation: slot.operation })}`;
				const version = nodeVersion === 1 && !selected ? '' : `, ${nodeVersion}${selected ?? ''}`;
				return {
					path,
					summary: `${contract.action}. ${contract.summary} (provider: ${provided})`,
					text: [
						'<In, Ctx>(',
						`\tconfig: { name: string; settings?: NodeSettings } & ${name}Input<In, Ctx>,`,
						`): Provider<In, Ctx, ${JSON.stringify(provided)}> =>`,
						`\tcontractProvider(${JSON.stringify(nodeType)}, ${JSON.stringify(provided)}, config${version})`,
					].join('\n'),
				};
			}
			const { outputs } = contract;
			const shown = outputs ? `; outputs: ${outputsText(outputs)}` : '';
			const flow = `${contract.flow.effect}, ${contract.flow.cardinality}${shown}${scopesNote(contract)}${egressNote(contract)}${replyNote(pairing, 'reply')}`;
			const requires = requiresOf(contract);
			const nodeVersion = typeVersion ?? contract.version;
			const pageFields = pageFieldsOf(contract.input);
			// A routed step has no reply pairing and no page values.
			const args = (routed: boolean) =>
				trailingArgs([
					String(slot?.typeVersion ?? nodeVersion),
					slot
						? JSON.stringify({ resource: slot.resource, operation: slot.operation })
						: 'undefined',
					requires ?? 'undefined',
					pairing && !routed ? JSON.stringify(pairing) : 'undefined',
					pageFields.length && !routed ? JSON.stringify(pageFields) : 'undefined',
				]);
			const input = `${name}Input<In, Ctx>`;
			const binaryPaths = binaryPathsOf(contract.input);
			// The build compiles the lambda of a binary field to the key of a binary of the item.
			const configArg = binaryPaths.length
				? `binaryKeys(config, ${JSON.stringify(binaryPaths)})`
				: 'config';
			// A passed item keeps the type of the item before. Else a sample refines the output, also
			// the derived one, e.g. types an open JSON body, as a sample types the output of node().
			const passed = contract.output['x-n8n-passed'];
			const output = `OutputOf<N, ${name}Output>`;
			const generics = (more = '') =>
				`<In, Ctx, const N extends string${more}${passed ? '' : `, S extends ${output} = ${output}`}>(`;
			const item = passed ? 'In' : `Sampled<${output}, S>`;
			const samples = passed ? 'In[]' : `Array<S & Exact<S, ${output}>>`;
			const config = `{ name: N; sample?: ${samples}; settings?: NodeSettings }`;
			// The entries type the output, so the config is generic and checked key by key.
			const entryItem = `OutputOf<N, ${name}Output & ${name}Fields<C>>`;
			const text =
				contract.output['x-n8n-entry-fields'] && !outputs
					? [
							`<In, Ctx, const N extends string, const C extends ${input}>(`,
							`\tconfig: { name: N; sample?: Array<${entryItem}>; settings?: NodeSettings } & C & Exact<C, ${input} & { name: string; sample?: unknown; settings?: NodeSettings }>,`,
							`): Step<In, Ctx, ${entryItem}, N> =>`,
							`\tcontractStep(${JSON.stringify(nodeType)}, ${configArg}${args(false)})`,
						]
					: !outputs
						? [
								generics(),
								`\tconfig: ${config} & ${input},`,
								`): Step<In, Ctx, ${item}, N> =>`,
								`\tcontractStep(${JSON.stringify(nodeType)}, ${configArg}${args(false)})`,
							]
						: 'each' in outputs
							? [
									generics(', const E extends string'),
									`\tconfig: ${config} & Omit<${input}, ${JSON.stringify(outputs.each)}> & {`,
									`\t\t${key(outputs.each)}: ReadonlyArray<${input}[${JSON.stringify(outputs.each)}][number] & { output: E }>;`,
									'\t},',
									`): RoutedStep<In, Ctx, ${item}, N, ${['E', ...(outputs.then ?? []).map((then) => JSON.stringify(then))].join(' | ')}> =>`,
									`\troutedStep(${JSON.stringify(nodeType)}, ${configArg}, ${JSON.stringify(outputs)}${args(true)})`,
								]
							: [
									generics(),
									`\tconfig: ${config} & ${input},`,
									`): RoutedStep<In, Ctx, ${item}, N, ${outputs.map((output) => JSON.stringify(output)).join(' | ')}> =>`,
									`\troutedStep(${JSON.stringify(nodeType)}, ${configArg}, ${JSON.stringify(outputs)}${args(true)})`,
								];
			return {
				path,
				summary: `${contract.action}. ${contract.summary} (${flow})`,
				text: text.join('\n'),
			};
		},
	);
	// The host makes an agent tool node type of each tool action of this package.
	const tools = named.filter(
		({ contract, slot, typeVersion }) =>
			!slot && typeVersion === undefined && isToolContract(contract),
	);
	const toolFactories = tools.map(({ contract, name, nodeType, resource, operation }): Factory => {
		const tool = `${operation}Tool`;
		const pageFields = pageFieldsOf(contract.input);
		const args = trailingArgs([
			String(contract.version),
			pageFields.length ? JSON.stringify(pageFields) : 'undefined',
		]);
		const idempotent = contract.flow.idempotent ? ', idempotent' : '';
		return {
			path: resource === undefined ? [tool] : [resource, tool],
			summary: `${contract.action}, as an agent tool (${contract.flow.effect}${idempotent})`,
			text: [
				`<In, Ctx>(config: ToolConfig<${name}Input<In, Ctx>>): Provider<In, Ctx, "tool"> =>`,
				`\tcontractTool(${JSON.stringify(`${nodeType}Tool`)}, config${args})`,
			].join('\n'),
		};
	});
	// A trigger starts a flow. Its input takes plain values: there is no item to read yet.
	const plain: Mode = { ...input, plain: true };
	// A trigger output marks its optional fields, e.g. a WhatsApp event has messages or statuses.
	const triggerOutput: Mode = { ...output, nullableOutputs: false };
	const triggerTypes = triggers.map(({ contract }) => {
		const name = typeName(contract.id);
		const entries = contract.output['x-n8n-entry-fields'];
		return [
			`export type ${name}Input = ${renderTs(contract.input, plain)};`,
			`export type ${name}Output = ${renderTs(outputItemSchema(contract.output), triggerOutput)};`,
			...(entries ? [`export type ${name}Fields<C> = ${entryFieldsTs(entries)};`] : []),
		].join('\n');
	});
	const triggerFactories = triggers.map(
		({ contract, nodeType, resource, operation, typeVersion, slot, pairing }): Factory => {
			const path = resource === undefined ? [operation] : [resource, operation];
			const name = typeName(contract.id);
			const declared = declaredFieldsOf(contract.output);
			const entries = contract.output['x-n8n-entry-fields'];
			const own = entries ? `${name}Output & ${name}Fields<C>` : `${name}Output`;
			const item = declared.length ? `Declared<${own}, S>` : own;
			const out = `OutputOf<N, ${item}>`;
			const requires = requiresOf(contract);
			const nodeVersion = slot?.typeVersion ?? typeVersion ?? contract.version;
			// The example fills the fields that a sample item or a declared schema leaves out.
			const options = JSON.stringify({
				...(pairing ? { pairing } : {}),
				example: jsonExampleOf(contract.output),
				...(declared.length ? { takesSchema: true } : {}),
				...(slot ? { slot: { resource: slot.resource, operation: slot.operation } } : {}),
			});
			const args = [String(nodeVersion), requires ?? 'undefined', options];
			const schemas = declared.map((field) => `${key(field)}?: ValueSchema`).join('; ');
			// The entries type the output, so the config is generic and checked key by key.
			const generics = [
				'const N extends string',
				...(declared.length ? [`const S extends { ${schemas} } = {}`] : []),
				...(entries ? [`const C extends ${name}Input`] : []),
			];
			const samples = `Array<DeepPartial<${item}>>`;
			const head = `{ name: N;${declared.length ? ' schema?: S;' : ''} sample?: ${samples}; settings?: NodeSettings }`;
			const flowKeys = `{ name: string;${declared.length ? ' schema?: unknown;' : ''} sample?: unknown; settings?: NodeSettings }`;
			const input = entries ? `C & Exact<C, ${name}Input & ${flowKeys}>` : `${name}Input`;
			const text = [
				`<${generics.join(', ')}>(`,
				`\tconfig: ${head} & ${input},`,
				`): Trigger<${out}, N> =>`,
				`\tcontractTrigger(${JSON.stringify(nodeType)}, config${args.map((arg) => `, ${arg}`).join('')})`,
			].join('\n');
			const schemaNote = declared.length ? `; schema types ${declared.join(', ')}` : '';
			const source = `trigger, ${contract.trigger ?? ''}${scopesNote(contract)}${schemaNote}${replyNote(pairing, 'trigger')}`;
			return { path, summary: `${contract.action}. ${contract.summary} (${source})`, text };
		},
	);
	const body = [...types, ...triggerTypes].join('\n\n');
	const routed = named.some(({ contract }) => contract.outputs !== undefined);
	const providers = named.filter(({ contract }) => providedOf(contract.output));
	const steps = named.filter(({ contract }) => !providedOf(contract.output));
	const derived = steps.some(({ contract }) => !contract.output['x-n8n-passed']);
	const declares = triggers.some(({ contract }) => declaredFieldsOf(contract.output).length > 0);
	const hasEntries = [...named, ...triggers].some(
		({ contract }) => contract.output['x-n8n-entry-fields'],
	);
	const imports = [
		...(steps.some(({ contract }) => hasBinary(contract.input)) ? ['binaryKeys'] : []),
		...(providers.length > 0 ? ['contractProvider'] : []),
		...(steps.length > 0 ? ['contractStep'] : []),
		...(tools.length > 0 ? ['contractTool'] : []),
		...(triggers.length > 0 ? ['contractTrigger'] : []),
		...(routed ? ['routedStep'] : []),
		...([...named, ...triggers].some(({ contract }) => usesBinary(contract))
			? ['type Binary']
			: []),
		...(declares ? ['type Declared'] : []),
		...(triggers.length > 0 ? ['type DeepPartial'] : []),
		...(named.some(({ contract }) => hasBinary(contract.input)) ? ['type Dollar'] : []),
		...(hasEntries ? ['type EntryFields'] : []),
		...(hasEntries || derived ? ['type Exact'] : []),
		...(body.includes(`Value<I, C, ${OPEN_VALUE}>`) ? [`type ${OPEN_VALUE}`] : []),
		...(body.includes('ModelOf<') ? ['type ModelOf'] : []),
		'type NodeSettings',
		...(derived || triggers.length > 0 ? ['type OutputOf'] : []),
		...(body.includes('PageValue<') ? ['type PageValue'] : []),
		...(body.includes('Provider<') || providers.length > 0 || tools.length > 0
			? ['type Provider']
			: []),
		...(routed ? ['type RoutedStep'] : []),
		...(factories.some(({ text }) => text.includes('Sampled<')) ? ['type Sampled'] : []),
		...(steps.length > 0 ? ['type Step'] : []),
		...(tools.length > 0 ? ['type ToolConfig'] : []),
		...(triggers.length > 0 ? ['type Trigger'] : []),
		...(body.includes('Value<') ? ['type Value'] : []),
		...(declares ? ['type ValueSchema'] : []),
	];
	const exported = [...factories, ...toolFactories, ...triggerFactories];
	return (
		[
			`// Generated from the ${nodeId} action contracts. Do not edit.`,
			...credentialLines(nodeId, contracts),
			...joins,
			...(routed
				? [
						'// A step with outputs: route(step, { <output>: part }) continues from each output; the next position only from the first.',
					]
				: []),
			...(tools.length > 0
				? [
						'// An <action>Tool factory gives the action to an AI agent as a tool: the model fills each fromModel() field, and the workflow fixes the others.',
					]
				: []),
			...(exported.length > 0
				? [
						`import { ${imports.join(', ')} } from '@n8n/workflow-sdk/next';`,
						'',
						body,
						'',
						`export const ${nodeId} = ${nest(exported, '')};`,
					]
				: ['export {};']),
			'',
		]
			.join('\n')
			// The agent reads the module in a JSON string, where a space costs fewer tokens than a tab.
			.replace(/^\t+/gm, (tabs) => ' '.repeat(tabs.length))
	);
}

/**
 * The declaration that types `ModelOf<provider>` in `@n8n/workflow-sdk/next` by a model
 * catalog, e.g. `{ openai: ['gpt-5', 'gpt-5-mini'] }`. A provider without IDs stays untyped.
 */
export function modelCatalogDeclaration(catalog: Readonly<Record<string, readonly string[]>>) {
	const members = Object.entries(catalog)
		.filter(([, ids]) => ids.length > 0)
		.map(
			([provider, ids]) =>
				`\t\t${key(provider)}: ${[...new Set(ids)].map((id) => JSON.stringify(id)).join(' | ')};`,
		);
	if (members.length === 0) return 'export {};\n';
	return [
		'export {};',
		"declare module '@n8n/workflow-sdk/next' {",
		'\tinterface ModelCatalog {',
		...members,
		'\t}',
		'}',
		'',
	].join('\n');
}
