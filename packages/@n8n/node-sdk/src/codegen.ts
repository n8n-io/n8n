import type { ContractDocument } from './define';
import type { JsonSchema } from './schema';

const pascal = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const typeName = (id: string) => id.split('.').map(pascal).join('');
const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
const doc = (text: string | undefined, indent: string) =>
	text ? `${indent}/** ${text.replace(/\*\//g, '*\\/')} */\n` : '';

interface Mode {
	/** Wrap leaves in `Value<I, C, T>` so they accept a lambda. */
	input: boolean;
	indent: string;
}

/** `^property_[a-z0-9_]+$` → `property_${Lowercase<string>}`; `^x_` → `x_${string}`. */
function patternKey(pattern: string): string {
	const lower = /^\^([\w-]+)\[a-z0-9_\]\+\$$/.exec(pattern)?.[1];
	if (lower) return `\`${lower}\${Lowercase<string>}\``;
	const prefix = /^\^([\w-]+)$/.exec(pattern.replace(/\.\*$/, ''))?.[1];
	return prefix ? `\`${prefix}\${string}\`` : 'string';
}

/** The value types of an open key space, as a doc comment the agent reads. */
function valueTypesDoc(schema: JsonSchema, indent: string): string {
	const types = schema['x-n8n-value-types'];
	if (!types) return '';
	const lines = Object.entries(types).map(([name, child]) => {
		const hint = child['x-n8n-hint'] ? ` (${child['x-n8n-hint']})` : '';
		return `${indent} * - ${name}: ${toTs(child, { input: false, indent: '' }).replace(/\s+/g, ' ')}${hint}`;
	});
	return `${indent}/**\n${indent} * Value by property type:\n${lines.join('\n')}\n${indent} */\n`;
}

function leaf(text: string, schema: JsonSchema, mode: Mode): string {
	return mode.input && !schema['x-n8n-literal'] ? `Value<I, C, ${text}>` : text;
}

function objectTs(schema: JsonSchema, mode: Mode, tag?: { name: string; values: string }): string {
	const inner = `${mode.indent}\t`;
	const required = new Set(schema.required ?? []);
	const properties = Object.entries(schema.properties ?? {}).filter(([name]) => name !== tag?.name);
	const members = [
		...(tag ? [`${inner}${key(tag.name)}: ${tag.values};`] : []),
		...properties.map(
			([name, child]) =>
				`${doc(child['x-n8n-hint'] ?? child.description, inner)}${inner}${key(name)}${required.has(name) || !mode.input ? '' : '?'}: ${toTs(child, { ...mode, indent: inner })};`,
		),
		...Object.entries(schema.patternProperties ?? {}).map(
			([pattern, child]) =>
				`${valueTypesDoc(schema, inner)}${inner}[key: ${patternKey(pattern)}]: ${toTs(child, { ...mode, indent: inner })};`,
		),
	];
	const { additionalProperties } = schema;
	if (typeof additionalProperties === 'object') {
		members.push(
			`${inner}[key: string]: ${toTs(additionalProperties, { ...mode, indent: inner })};`,
		);
	} else if (additionalProperties === true || (additionalProperties === undefined && !mode.input)) {
		// Open shape: reads compile, so missing type information never blocks a build.
		members.push(`${inner}[key: string]: any;`);
	}
	return members.length ? `{\n${members.join('\n')}\n${mode.indent}}` : 'Record<string, never>';
}

/**
 * A tagged union with branches that differ only in the tag collapses to one object per
 * distinct shape (`op: "equals" | "contains"; value: …`), which keeps agent views small.
 */
function variantTs(schema: JsonSchema, branches: readonly JsonSchema[], mode: Mode): string {
	const name = schema.discriminator?.propertyName ?? '';
	const groups = new Map<string, { branch: JsonSchema; tags: unknown[] }>();
	for (const branch of branches) {
		const rest = objectTs(branch, mode, { name, values: '' });
		const group = groups.get(rest);
		const tagValue = branch.properties?.[name]?.const;
		if (group) group.tags.push(tagValue);
		else groups.set(rest, { branch, tags: [tagValue] });
	}
	return [...groups.values()]
		.map(({ branch, tags }) =>
			objectTs(branch, mode, { name, values: tags.map((t) => JSON.stringify(t)).join(' | ') }),
		)
		.join(' | ');
}

/** JSON Schema as TypeScript type text. */
export function toTs(schema: JsonSchema, mode: Mode): string {
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

/**
 * The TypeScript module for one node's actions. The agent reads this text, and `tsc` checks
 * the workflow against it, so what the agent sees is exactly what is enforced.
 */
export function generateNodeModule(nodeId: string, actions: readonly GeneratedAction[]): string {
	const types = actions.map(({ contract }) => {
		const name = typeName(contract.id);
		const flow = `${contract.flow.effect}, ${contract.flow.cardinality}`;
		return [
			`/** ${contract.action}. ${contract.summary} (${flow}) */`,
			`export type ${name}Input<I, C> = ${toTs(contract.input, { input: true, indent: '' })};`,
			`export type ${name}Output = ${toTs(contract.output, { input: false, indent: '' })};`,
		].join('\n');
	});
	const factories = actions.map(({ contract, nodeType }): Factory => {
		const name = typeName(contract.id);
		const [, ...path] = contract.id.split('.');
		const text = [
			'<In, Ctx, const N extends string>(',
			`\tconfig: { name: N; sample?: ${name}Output[] } & ${name}Input<In, Ctx>,`,
			`): Step<In, Ctx, OutputOf<N, ${name}Output>, N> =>`,
			`\tcontractStep(${JSON.stringify(nodeType)}, config)`,
		].join('\n');
		return { path, summary: `${contract.action}. ${contract.summary}`, text };
	});
	return [
		`// Generated from the ${nodeId} action contracts. Do not edit.`,
		"import { contractStep, type OutputOf, type Step, type Value } from '@n8n/workflow-sdk/next';",
		'',
		types.join('\n\n'),
		'',
		`export const ${nodeId} = ${nest(factories, '')};`,
		'',
	].join('\n');
}
