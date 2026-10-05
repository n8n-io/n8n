import { isRecord } from '@n8n/utils/is-record';
import { isNodeParameters, type INodeProperties } from 'n8n-workflow';

import {
	shapeOf,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type Schema,
	type Shape,
} from './schema';

/**
 * The widgets of the n8n form, by name: the value type that each one edits and its config. A
 * field takes a widget only when the widget edits every value of the field. The host shows a
 * widget that it does not know as the default field. A node package can add a widget with
 * declaration merging.
 */
export interface Widgets {
	/** A text box with more lines, for a string. */
	readonly textarea: Widget<
		string,
		{
			/**
			 * The number of lines.
			 *
			 * @defaultValue `4`
			 */
			readonly rows?: number;
		}
	>;
	/**
	 * The JSON editor, for an object, a list or a variant. A variant is a tag dropdown and the
	 * fields of each branch without it. The two store the value in other forms, so a change
	 * between them is a major.
	 */
	readonly json: Widget<object, Readonly<Record<never, never>>>;
}

/** One entry of `Widgets`. */
interface Widget<Value, Config> {
	/** The value type that the widget edits. */
	readonly value: Value;
	/** The config that the widget takes. */
	readonly config: Config;
}

/** The form UI of one field in a manifest. */
export interface FieldUiDocument {
	/** A name in `Widgets`. */
	readonly widget?: string;
	/** The config of the widget. */
	readonly config?: Readonly<Record<string, unknown>>;
	/** The text in the empty field. Without it, the first of `examples`. */
	readonly placeholder?: string;
}

/**
 * The `ui` block of a manifest: the n8n form only. Agents and MCP do not read it, and it is not in
 * the contract hash. A change is a patch, but a change that moves a stored parameter is a major.
 */
export interface ActionUiDocument {
	/** The fields to show first, in this order. The other fields follow in input order. */
	readonly order?: readonly string[];
	/** Optional fields to show in one "Options" collection, as legacy n8n nodes do. */
	readonly advanced?: readonly string[];
	/** The UI of each field by path: `field`, or `field.branchField` in a variant. */
	readonly fields?: Readonly<Record<string, FieldUiDocument>>;
}

type WidgetOf<T> = {
	[W in keyof Widgets]: [T] extends [Widgets[W]['value']]
		? {
				/** A name in `Widgets`. */
				readonly widget: W;
				/** The config of the widget. */
				readonly config?: Widgets[W]['config'];
			}
		: never;
}[keyof Widgets];

/** The form UI of a field of type `T`: a placeholder, and a widget that edits `T`. */
export type FieldUi<T> = {
	/** The text in the empty field. Without it, the first of `examples`. */
	readonly placeholder?: string;
} & (WidgetOf<T> | { readonly widget?: never; readonly config?: never });

type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;
/** `field.branchField` for each field of each branch of a variant. */
type BranchPaths<K extends string, T> = true extends IsUnion<T>
	? T extends Readonly<Record<string, unknown>>
		? `${K}.${keyof T & string}`
		: never
	: never;
type FieldPath<S extends Shape> = {
	[K in keyof S & string]: K | BranchPaths<K, Infer<S[K]>>;
}[keyof S & string];
type BranchValue<T, F extends string> = T extends unknown
	? F extends keyof T
		? T[F]
		: never
	: never;
type ValueAt<S extends Shape, P extends string> = P extends keyof S
	? Infer<S[P]>
	: P extends `${infer K}.${infer F}`
		? K extends keyof S
			? BranchValue<Infer<S[K]>, F>
			: never
		: never;
type OptionalKey<S extends Shape> = {
	[K in keyof S]: S[K] extends Schema<unknown, true> ? K : never;
}[keyof S] &
	string;

/**
 * The n8n form of an action, typed by its input `S`: a key that the input lacks fails `tsc`. The
 * form puts each field under its `title`, so `ui` holds only layout and widgets. In a variant,
 * `fields` takes `field.branchField`.
 *
 * @example
 * ```ts
 * ui: {
 *   order: ['channel', 'text'],
 *   advanced: ['threadTs', 'replyBroadcast'],
 *   fields: { text: { widget: 'textarea', config: { rows: 6 } } },
 * },
 * ```
 */
export type ActionUi<S extends Shape> = string extends keyof S
	? ActionUiDocument
	: {
			/** The fields to show first, in this order. The other fields follow in input order. */
			readonly order?: ReadonlyArray<keyof S & string>;
			/**
			 * Optional fields to show in one "Options" collection. An input with an `options` field
			 * has no such collection.
			 */
			readonly advanced?: 'options' extends keyof S ? never : ReadonlyArray<OptionalKey<S>>;
			/** The UI of each field: a placeholder and a widget. */
			readonly fields?: {
				readonly [P in FieldPath<S>]?: FieldUi<Exclude<ValueAt<S, P>, undefined>>;
			};
		};

const isVariant = (json: JsonSchema) =>
	json.discriminator !== undefined && json.oneOf !== undefined;

/** The n8n parameter that holds the advanced fields. */
const OPTIONS = 'options';

/** The advanced fields that the form puts into the Options collection: optional fields only. */
function advancedOf(input: JsonSchema, ui: ActionUiDocument): ReadonlySet<string> {
	const properties = input.properties ?? {};
	const required = input.required ?? [];
	if (Object.hasOwn(properties, OPTIONS)) return new Set();
	return new Set(
		(ui.advanced ?? []).filter(
			(name) => Object.hasOwn(properties, name) && !required.includes(name),
		),
	);
}

/** The n8n parameter path of each input field: an advanced field is in the Options collection. */
export function parameterPathOf(
	input: JsonSchema,
	ui: ActionUiDocument = {},
): (name: string) => string {
	const advanced = advancedOf(input, ui);
	return (name) => (advanced.has(name) ? `${OPTIONS}.${name}` : name);
}

/**
 * The n8n parameters of a contract input, as the generated form stores them: each advanced field
 * goes into the Options collection, and every other value stays as it is.
 */
export function nodeParametersOf(
	value: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument = {},
): Record<string, unknown> {
	const advanced = advancedOf(input, ui);
	const entries = Object.entries(value);
	const options = entries.filter(([name]) => advanced.has(name));
	return {
		...Object.fromEntries(entries.filter(([name]) => !advanced.has(name))),
		...(options.length > 0 ? { [OPTIONS]: Object.fromEntries(options) } : {}),
	};
}

/**
 * The form of an agent tool. The model fills a whole field with one `$fromAI()` expression, which
 * is text, so a variant stays JSON and no field goes into the Options collection.
 */
export function toolUiOf(input: JsonSchema, ui: ActionUiDocument = {}): ActionUiDocument {
	const variants = Object.entries(input.properties ?? {})
		.filter(([, field]) => isVariant(field))
		.map(([name]) => [name, { ...ui.fields?.[name], widget: 'json' }]);
	return {
		...(ui.order ? { order: ui.order } : {}),
		fields: { ...ui.fields, ...Object.fromEntries(variants) },
	};
}

/** The fields of the n8n form of an input, in `ui` order, with the advanced fields last. */
export function formPropertiesOf(input: JsonSchema, ui: ActionUiDocument = {}): INodeProperties[] {
	const order = ui.order ?? [];
	const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
	const fields = Object.entries(shapeOf(input))
		.sort(([a], [b]) => rank(a) - rank(b))
		.map(([name, schema]) => ({ name, property: toProperty(name, schema, ui.fields) }));
	const advanced = advancedOf(input, ui);
	const main = fields.filter(({ name }) => !advanced.has(name)).map(({ property }) => property);
	const options = fields.filter(({ name }) => advanced.has(name)).map(({ property }) => property);
	if (options.length === 0) return main;
	return [
		...main,
		{
			displayName: 'Options',
			name: OPTIONS,
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options,
		},
	];
}

type WidgetRenderer = (
	property: INodeProperties,
	config: Readonly<Record<string, unknown>>,
	schema: AnySchema,
) => INodeProperties;

/** The built-in entries of `Widgets`. */
const WIDGETS: Readonly<Record<keyof Widgets, WidgetRenderer>> = {
	textarea: (property, { rows }) =>
		property.type === 'string'
			? {
					...property,
					typeOptions: { ...property.typeOptions, rows: typeof rows === 'number' ? rows : 4 },
				}
			: property,
	json: ({ options: _options, typeOptions: _typeOptions, ...property }, _config, schema) => ({
		...property,
		type: 'json',
		default: jsonDefaultOf(schema),
	}),
};

const isWidget = (name: string): name is keyof Widgets => Object.hasOwn(WIDGETS, name);

/** A `json` property keeps the JSON value; n8n resolves expressions inside it per item. */
const jsonDefaultOf = ({ json, isOptional }: AnySchema) =>
	json.default !== undefined ? JSON.stringify(json.default) : isOptional ? '' : '{}';

const placeholderOf = (example: unknown) =>
	example === undefined
		? undefined
		: typeof example === 'string'
			? example
			: JSON.stringify(example);

/**
 * The n8n property of an input field. n8n fills every property default into the parameters it
 * runs with. An optional field without a default gets '', which the runtime drops, so an unset
 * field stays unset. `path` names the field in `fields`.
 */
export function toProperty(
	name: string,
	schema: AnySchema,
	fields: Readonly<Record<string, FieldUiDocument>> = {},
	path = name,
): INodeProperties {
	const { widget, config = {} } = fields[path] ?? {};
	const property = basePropertyOf(name, schema, fields, path);
	return widget !== undefined && isWidget(widget)
		? WIDGETS[widget](property, config, schema)
		: property;
}

function basePropertyOf(
	name: string,
	schema: AnySchema,
	fields: Readonly<Record<string, FieldUiDocument>>,
	path: string,
): INodeProperties {
	const { json } = schema;
	const unset = schema.isOptional && json.default === undefined;
	const placeholder = fields[path]?.placeholder ?? placeholderOf(json.examples?.[0]);
	const base = {
		displayName: json.title ?? name,
		name,
		required: !schema.isOptional,
		...(json['x-n8n-hint'] ? { description: json['x-n8n-hint'] } : {}),
		...(placeholder === undefined ? {} : { placeholder }),
	};
	if (json['x-n8n-binary']) {
		// n8n stores the name of a binary of the input item, or an expression for a binary object.
		return {
			description: 'The binary field of the input item, e.g. data',
			...base,
			type: 'string',
			default: '',
		};
	}
	if (json.enum) {
		const labels = json['x-n8n-options'] ?? {};
		const options = json.enum.flatMap((value) => {
			if (typeof value !== 'string' && typeof value !== 'number') return [];
			const label = labels[String(value)];
			return [
				{
					name: label?.name ?? String(value),
					value,
					...(label?.description ? { description: label.description } : {}),
				},
			];
		});
		const initial = options.find(({ value }) => value === json.default) ?? options[0];
		return { ...base, type: 'options', options, default: unset ? '' : (initial?.value ?? '') };
	}
	if (isVariant(json) && fields[path]?.widget !== 'json') {
		return variantProperty(base, schema, fields, path);
	}
	switch (json.type) {
		case 'string':
			return {
				...base,
				type: 'string',
				default: typeof json.default === 'string' ? json.default : '',
			};
		case 'number':
		case 'integer': {
			const { minimum, maximum } = json;
			const limits = {
				...(minimum === undefined ? {} : { minValue: minimum }),
				...(maximum === undefined ? {} : { maxValue: maximum }),
			};
			return {
				...base,
				type: 'number',
				default: typeof json.default === 'number' ? json.default : unset ? '' : 0,
				...(Object.keys(limits).length > 0 ? { typeOptions: limits } : {}),
			};
		}
		case 'boolean':
			return { ...base, type: 'boolean', default: json.default === true };
		default:
			return { ...base, type: 'json', default: jsonDefaultOf(schema) };
	}
}

interface Branch {
	/** The tag value of the branch. */
	readonly value: string;
	readonly json: JsonSchema;
}

const branchesOf = (json: JsonSchema): readonly Branch[] => {
	const tag = json.discriminator?.propertyName ?? '';
	return (json.oneOf ?? []).flatMap((branch) => {
		const value = branch.properties?.[tag]?.const;
		return typeof value === 'string' ? [{ value, json: branch }] : [];
	});
};

/**
 * A variant is a collection that holds the contract value as it is: a tag dropdown, and the fields
 * of each branch, which show only for their tag. A field that several branches have with the same
 * schema is one property.
 */
function variantProperty(
	base: Pick<INodeProperties, 'displayName' | 'name' | 'required' | 'description'>,
	schema: AnySchema,
	fields: Readonly<Record<string, FieldUiDocument>>,
	path: string,
): INodeProperties {
	const { json } = schema;
	const tag = json.discriminator?.propertyName ?? '';
	const branches = branchesOf(json);
	const members = branches.flatMap(({ value, json: branch }) =>
		Object.entries(shapeOf(branch))
			.filter(([name]) => name !== tag)
			.map(([name, field]) => ({
				name,
				field,
				value,
				key: `${name} ${JSON.stringify(field.json)}`,
			})),
	);
	const keys = [...new Set(members.map(({ key }) => key))];
	const children = keys.flatMap((key) => {
		const same = members.filter((member) => member.key === key);
		const [first] = same;
		if (!first) return [];
		return [
			{
				...toProperty(first.name, first.field, fields, `${path}.${first.name}`),
				// n8n checks a required collection option against the parent level, so the run checks it.
				required: false,
				displayOptions: { show: { [tag]: same.map(({ value }) => value) } },
			},
		];
	});
	const [initial] = branches;
	const fallback = schema.isOptional || !initial ? {} : { [tag]: initial.value };
	const defaultTag = isRecord(json.default) ? json.default[tag] : undefined;
	return {
		...base,
		type: 'collection',
		placeholder: 'Add field',
		default: isNodeParameters(json.default) ? json.default : fallback,
		options: [
			{
				displayName: base.displayName,
				name: tag,
				type: 'options',
				noDataExpression: true,
				options: branches.map(({ value, json: branch }) => ({
					name: branch.title ?? value,
					value,
					...(branch.description ? { description: branch.description } : {}),
				})),
				default: typeof defaultTag === 'string' ? defaultTag : (initial?.value ?? ''),
			},
			...children,
		],
	};
}

/**
 * Reads an input field from its n8n parameter value: a `json` property holds text after an edit
 * in the editor, and a variant collection without its tag is unset. The reader does not depend on
 * `ui`, so it also reads what an older form of the version stored. A run makes it once per field.
 */
export function inputReaderOf(schema: AnySchema): (value: unknown) => unknown {
	if (!isVariant(schema.json)) {
		const { type } = toProperty('', schema);
		return type === 'json' ? (value) => parameterValue(value, true) : (value) => value;
	}
	const tag = schema.json.discriminator?.propertyName ?? '';
	const readers = new Map(
		branchesOf(schema.json).map(({ value, json }) => [
			value,
			new Map(Object.entries(shapeOf(json)).map(([field, child]) => [field, inputReaderOf(child)])),
		]),
	);
	return (parameter) => {
		const value = parameterValue(parameter, true);
		if (!isRecord(value)) return value;
		if (value[tag] === undefined) return Object.keys(value).length === 0 ? undefined : value;
		const branch = typeof value[tag] === 'string' ? readers.get(value[tag]) : undefined;
		if (!branch) return value;
		return Object.fromEntries(
			Object.entries(value).flatMap(([field, member]) => {
				const read = branch.get(field);
				const decoded = read ? read(member) : member;
				// As for a top-level field, an empty value is an unset field.
				return decoded === undefined || decoded === '' ? [] : [[field, decoded]];
			}),
		);
	};
}

/** n8n keeps a `json` property as text. Other fields keep the text the user typed. */
export function parameterValue(value: unknown, isJson: boolean): unknown {
	if (!isJson || typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}
