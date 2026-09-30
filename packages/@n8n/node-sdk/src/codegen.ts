import type { ContractDocument } from './define';
import type { JsonSchema } from './schema';

const pascal = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const typeName = (id: string) => id.split('.').map(pascal).join('');
const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
const doc = (text: string | undefined, indent: string) =>
	text ? `${indent}/** ${text.replace(/\*\//g, '*\\/')} */\n` : '';
const docOf = (schema: JsonSchema) => schema['x-n8n-hint'] ?? schema.description;

/** A local type that replaces a type text used more than once in a module. */
interface Alias {
	readonly name: string;
	readonly generic: boolean;
}

interface Mode {
	/** Wrap leaves in `Value<I, C, T>` so they accept a lambda. */
	input: boolean;
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

/** `^property_[a-z0-9_]+$` → `property_${Lowercase<string>}`; `^x_` → `x_${string}`. */
function patternKey(pattern: string): string {
	const lower = /^\^([\w-]+)\[a-z0-9_\]\+\$$/.exec(pattern)?.[1];
	if (lower) return `\`${lower}\${Lowercase<string>}\``;
	const prefix = /^\^([\w-]+)$/.exec(pattern.replace(/\.\*$/, ''))?.[1];
	return prefix ? `\`${prefix}\${string}\`` : 'string';
}

/** The value types of an open key space, as a doc comment the agent reads. */
function valueTypesDoc(schema: JsonSchema, mode: Mode, indent: string): string {
	const types = schema['x-n8n-value-types'];
	if (!types) return '';
	const lines = Object.entries(types).map(([name, child]) => {
		const hint = child['x-n8n-hint'] ? ` (${child['x-n8n-hint']})` : '';
		const text = toTs(child, { input: false, indent: '', compact: mode.compact });
		return `${indent} * - ${name}: ${text.replace(/\s+/g, ' ')}${hint}`;
	});
	return `${indent}/**\n${indent} * Value by property type:\n${lines.join('\n')}\n${indent} */\n`;
}

function leaf(text: string, schema: JsonSchema, mode: Mode): string {
	return mode.input && !schema['x-n8n-literal'] ? `Value<I, C, ${text}>` : text;
}

interface Tag {
	readonly name: string;
	readonly values: string;
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
	const members = [
		...(tag ? [{ doc: '', body: `${key(tag.name)}: ${tag.values}` }] : []),
		...properties.map(([name, child]) => ({
			doc: doc(shownDoc(name, child), inner),
			body: `${key(name)}${required.has(name) || !mode.input ? '' : '?'}: ${toTs(child, childMode)}`,
		})),
		...Object.entries(schema.patternProperties ?? {}).map(([pattern, child]) => ({
			doc: valueTypesDoc(schema, mode, inner),
			body: `[key: ${patternKey(pattern)}]: ${toTs(child, childMode)}`,
		})),
	];
	const { additionalProperties } = schema;
	if (typeof additionalProperties === 'object') {
		members.push({ doc: '', body: `[key: string]: ${toTs(additionalProperties, childMode)}` });
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
	const groups = new Map<string, { branch: JsonSchema; tags: unknown[] }>();
	for (const branch of branches) {
		const rest = objectTs(branch, mode, { name, values: '' });
		const group = groups.get(rest);
		const tagValue = branch.properties?.[name]?.const;
		if (group) group.tags.push(tagValue);
		else groups.set(rest, { branch, tags: [tagValue] });
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
		.map(({ branch, tags }, index) =>
			objectTs(
				pick(branch, false),
				mode,
				{ name, values: tags.map((t) => JSON.stringify(t)).join(' | ') },
				new Set(groups.slice(0, index).flatMap((group) => docKeys(group.branch))),
			),
		)
		.join(' | ');
	if (!first || !shared.size) return union;
	const common = objectTs({ ...pick(first, true), additionalProperties: false }, mode);
	return `${common} & (${union})`;
}

function renderTs(schema: JsonSchema, mode: Mode): string {
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
			if (schema.additionalProperties === true && !schema.properties) {
				return leaf('Record<string, unknown>', schema, mode);
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

export interface GeneratedAction {
	readonly contract: ContractDocument;
	/** The n8n node type, e.g. `@n8n/nodes-base-next.notionDatabasePageGetAll`. */
	readonly nodeType: string;
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

const isGeneric = ({ input, root, text }: Shape) => input && (root || text.includes('Value<I, C,'));

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
 * The TypeScript module for one node's actions. The agent reads this text, and `tsc` checks
 * the workflow against it, so what the agent sees is exactly what is enforced.
 */
export function generateNodeModule(nodeId: string, actions: readonly GeneratedAction[]): string {
	const input: Mode = { input: true, indent: '', compact: true };
	const output: Mode = { input: false, indent: '', compact: true };
	const named = actions.map((action) => ({ ...action, name: typeName(action.contract.id) }));
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
		return [
			`export type ${name}Input<I, C> = ${rootTs(contract.input, actionInput, `${name}Input`)};`,
			`export type ${name}Output = ${rootTs(contract.output, actionOutput, `${name}Output`)};`,
			...locals,
		].join('\n');
	});
	const factories = named.map(({ contract, name, nodeType }): Factory => {
		const [, ...path] = contract.id.split('.');
		const flow = `${contract.flow.effect}, ${contract.flow.cardinality}`;
		// Version 1 is the default, so most modules stay as short as before.
		const version = contract.version === 1 ? '' : `, ${contract.version}`;
		const text = [
			'<In, Ctx, const N extends string>(',
			`\tconfig: { name: N; sample?: ${name}Output[] } & ${name}Input<In, Ctx>,`,
			`): Step<In, Ctx, OutputOf<N, ${name}Output>, N> =>`,
			`\tcontractStep(${JSON.stringify(nodeType)}, config${version})`,
		].join('\n');
		return { path, summary: `${contract.action}. ${contract.summary} (${flow})`, text };
	});
	return (
		[
			`// Generated from the ${nodeId} action contracts. Do not edit.`,
			"import { contractStep, type OutputOf, type Step, type Value } from '@n8n/workflow-sdk/next';",
			'',
			types.join('\n\n'),
			'',
			`export const ${nodeId} = ${nest(factories, '')};`,
			'',
		]
			.join('\n')
			// The agent reads the module in a JSON string, where a space costs fewer tokens than a tab.
			.replace(/^\t+/gm, (tabs) => ' '.repeat(tabs.length))
	);
}
