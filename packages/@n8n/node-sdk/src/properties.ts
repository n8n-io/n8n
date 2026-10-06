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
import type { Where } from './where';

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
	/**
	 * The n8n filter, for a `where` field. It stores the n8n filter value; the run and the build
	 * read it back as `where`, and they also read a `where` value that it did not store.
	 */
	readonly filter: Widget<Where, Readonly<Record<never, never>>>;
	/**
	 * The n8n field assignments (as in Edit Fields), for a record: one name, type and value for
	 * each key. The run and the build read the record back.
	 */
	readonly assignments: Widget<Readonly<Record<string, unknown>>, Readonly<Record<never, never>>>;
	/**
	 * Rows of the same fields (an n8n fixed collection), for a list of objects. Each row shows the
	 * fields of one item; `fields` takes the UI of an item field as `field.itemField`.
	 */
	readonly list: Widget<
		ReadonlyArray<Readonly<Record<string, unknown>>>,
		Readonly<Record<never, never>>
	>;
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

/**
 * `field.branchField` for each field of each branch of a `t.variant`, also of one branch. A union
 * or a nullable object renders as JSON, so it has none.
 */
type BranchPaths<K extends string, S> = S extends Schema<
	infer T,
	boolean,
	boolean,
	unknown,
	infer Tag
>
	? string extends Tag
		? never
		: FieldPaths<K, T>
	: never;
/** `field.subField` for each field of each object in `T`. */
type FieldPaths<K extends string, T> = T extends Readonly<Record<string, unknown>>
	? `${K}.${keyof T & string}`
	: never;
/** `field.itemField` for each field of the items of a list of objects. */
type ItemPaths<K extends string, T> = T extends ReadonlyArray<infer I>
	? I extends Readonly<Record<string, unknown>>
		? `${K}.${keyof I & string}`
		: never
	: never;
type FieldPath<S extends Shape> = {
	[K in keyof S & string]: K | BranchPaths<K, S[K]> | ItemPaths<K, Infer<S[K]>>;
}[keyof S & string];
type BranchValue<T, F extends string> = T extends unknown
	? F extends keyof T
		? T[F]
		: never
	: never;
type ItemValue<T, F extends string> = T extends ReadonlyArray<infer I>
	? F extends keyof I
		? I[F]
		: never
	: never;
type ValueAt<S extends Shape, P extends string> = P extends keyof S
	? Infer<S[P]>
	: P extends `${infer K}.${infer F}`
		? K extends keyof S
			? BranchValue<Infer<S[K]>, F> | ItemValue<Infer<S[K]>, F>
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

/** The input fields that the form puts into the Options collection, in input order. */
export function advancedFieldsOf(input: JsonSchema, ui: ActionUiDocument = {}): string[] {
	const advanced = advancedOf(input, ui);
	return Object.keys(input.properties ?? {}).filter((name) => advanced.has(name));
}

/**
 * The path of each input field that the form shows in the JSON editor, e.g.
 * `[['blocks'], ['body', 'json']]`. The editor keeps the value as text after an edit. A path into
 * a variant names the branch field.
 */
export function jsonFieldPathsOf(input: JsonSchema, ui: ActionUiDocument = {}): string[][] {
	return Object.entries(shapeOf(input)).flatMap(([name, schema]) => {
		const property = toProperty(name, schema, ui.fields);
		if (property.type === 'json') return [[name]];
		if (property.type !== 'collection') return [];
		const children = (property.options ?? []).flatMap((child) =>
			'type' in child && child.type === 'json' ? [child.name] : [],
		);
		return [...new Set(children)].map((child) => [name, child]);
	});
}

/** The n8n parameter path of each input field: an advanced field is in the Options collection. */
export function parameterPathOf(
	input: JsonSchema,
	ui: ActionUiDocument = {},
): (name: string) => string {
	const advanced = advancedOf(input, ui);
	return (name) => (advanced.has(name) ? `${OPTIONS}.${name}` : name);
}

/** Where the form stores an input field. */
export interface StoredField {
	/** The n8n parameter path, see `parameterPathOf`. */
	readonly path: string;
	/** Reads the stored value of the widget as the contract value. Any other value stays. */
	readonly read: (value: unknown) => unknown;
}

const asIs = (value: unknown) => value;

/** The parameter path and the widget read of each input field. */
export function storedFieldOf(
	input: JsonSchema,
	ui: ActionUiDocument = {},
): (name: string) => StoredField {
	const pathOf = parameterPathOf(input, ui);
	const shape = shapeOf(input);
	return (name) => ({
		path: pathOf(name),
		read: fieldCodecOf(ui.fields, name, shape[name])?.read ?? asIs,
	});
}

/**
 * The contract input in the stored parameters of a node, as the run reads it before the defaults:
 * each field from its parameter path, decoded from the form that stores it. An unset field (`''`
 * or no value) is not in the result. Expressions stay text. For an agent tool node, give
 * `toolUiOf(input, ui)`.
 *
 * @example
 * ```ts
 * contractInputOf({ text: 'Hi', options: { blocks: '[]' } }, input, { advanced: ['blocks'] });
 * // { text: 'Hi', blocks: [] }
 * ```
 */
export function contractInputOf(
	parameters: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument = {},
): Record<string, unknown> {
	const fieldOf = storedFieldOf(input, ui);
	return Object.fromEntries(
		Object.entries(shapeOf(input)).flatMap(([name, schema]) => {
			const { path, read } = fieldOf(name);
			const value = inputReaderOf(schema)(read(valueAt(parameters, path.split('.'))));
			return value === undefined || value === '' ? [] : [[name, value]];
		}),
	);
}

const valueAt = (parameters: Readonly<Record<string, unknown>>, path: readonly string[]) =>
	path.reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), parameters);

function withValueAt(
	parameters: Readonly<Record<string, unknown>>,
	[key, ...rest]: readonly string[],
	value: unknown,
): Record<string, unknown> {
	if (key === undefined) return { ...parameters };
	const inner = parameters[key];
	return {
		...parameters,
		[key]: rest.length === 0 ? value : withValueAt(isRecord(inner) ? inner : {}, rest, value),
	};
}

/** The parameters with `map` applied to the value of each field that a codec widget stores. */
function mapWidgetFields(
	parameters: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument,
	map: (codec: FieldCodec, value: unknown) => unknown,
): Record<string, unknown> {
	const pathOf = parameterPathOf(input, ui);
	return Object.entries(shapeOf(input)).reduce<Record<string, unknown>>(
		(result, [name, schema]) => {
			const codec = fieldCodecOf(ui.fields, name, schema);
			const path = pathOf(name).split('.');
			const value = valueAt(result, path);
			return codec === undefined || value === undefined
				? result
				: withValueAt(result, path, map(codec, value));
		},
		{ ...parameters },
	);
}

/**
 * The parameters of a node with the value of each codec widget field in the form that the widget
 * stores, as the editor saves it. A contract value, JSON text and a stored value all give the
 * stored value. Other parameters stay.
 */
export function storedParametersOf(
	parameters: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument = {},
): Record<string, unknown> {
	return mapWidgetFields(parameters, input, ui, ({ read, store }, value) => store(read(value)));
}

/**
 * The parameters of a node with the value of each codec widget field as its contract value, at
 * its parameter path, so that a reader of contract values reads them. Other parameters stay.
 */
export function contractParametersOf(
	parameters: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument = {},
): Record<string, unknown> {
	return mapWidgetFields(parameters, input, ui, ({ read }, value) => read(value));
}

/**
 * The n8n parameters of a contract input, as the generated form stores them: a field with a
 * codec widget in its stored form, each advanced field in the Options collection, and every
 * other value as it is.
 */
export function nodeParametersOf(
	value: Readonly<Record<string, unknown>>,
	input: JsonSchema,
	ui: ActionUiDocument = {},
): Record<string, unknown> {
	const advanced = advancedOf(input, ui);
	const shape = shapeOf(input);
	const entries = Object.entries(value).map(([name, field]) => {
		const codec = fieldCodecOf(ui.fields, name, shape[name]);
		return [name, codec ? codec.store(field) : field] as const;
	});
	const options = entries.filter(([name]) => advanced.has(name));
	return {
		...Object.fromEntries(entries.filter(([name]) => !advanced.has(name))),
		...(options.length > 0 ? { [OPTIONS]: Object.fromEntries(options) } : {}),
	};
}

/**
 * The form of an agent tool. The model fills a whole field with one `$fromAI()` expression, which
 * is text, so a variant and a field with a codec widget stay JSON, and no field goes into the
 * Options collection.
 */
export function toolUiOf(input: JsonSchema, ui: ActionUiDocument = {}): ActionUiDocument {
	const variants = Object.entries(input.properties ?? {})
		.filter(([name, field]) => isVariant(field) || isCodecWidget(ui.fields?.[name]?.widget))
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

/** A field of the form: its schema, the `ui` fields of the action, and its path in them. */
interface FormField {
	readonly schema: AnySchema;
	readonly fields: Readonly<Record<string, FieldUiDocument>>;
	readonly path: string;
}

type WidgetRenderer = (
	property: INodeProperties,
	config: Readonly<Record<string, unknown>>,
	field: FormField,
) => INodeProperties;

/** How a widget stores a value in another form than the contract value. */
interface ValueCodec {
	/** The stored form of a contract value. Any other value stays. */
	readonly store: (value: unknown, field: FormField) => unknown;
	/** The contract value of a stored value. Any other value stays, so an older stored form reads. */
	readonly read: (value: unknown, field: FormField) => unknown;
}

/** The codec of one field. */
interface FieldCodec {
	readonly store: (value: unknown) => unknown;
	readonly read: (value: unknown) => unknown;
}

/** How the host shows a widget, and its codec when it stores another form. */
interface WidgetEntry {
	/** The n8n property of the field. */
	readonly render: WidgetRenderer;
	readonly codec?: ValueCodec;
}

/** The built-in entries of `Widgets`. */
const WIDGETS: Readonly<Record<keyof Widgets, WidgetEntry>> = {
	textarea: {
		render: (property, { rows }) =>
			property.type === 'string'
				? {
						...property,
						typeOptions: { ...property.typeOptions, rows: typeof rows === 'number' ? rows : 4 },
					}
				: property,
	},
	json: {
		render: (
			{ options: _options, typeOptions: _typeOptions, ...property },
			_config,
			{ schema },
		) => ({
			...property,
			type: 'json',
			default: jsonDefaultOf(schema),
		}),
	},
	filter: {
		render: ({ options: _options, typeOptions: _typeOptions, placeholder: _p, ...property }) => ({
			...property,
			type: 'filter',
			default: {},
		}),
		codec: {
			store: (value) => (isWhere(value) ? filterValueOf(value) : value),
			read: (value) => {
				if (isFilterValue(value)) return whereOf(value);
				if (!isWhere(value)) return value;
				// n8n adds the filter defaults to any object that a filter parameter holds.
				const { combinator: _combinator, options: _options, ...stored } = value;
				return stored;
			},
		},
	},
	list: {
		render: (
			{ options: _options, typeOptions: _typeOptions, placeholder: _p, ...property },
			_config,
			field,
		) => ({
			...property,
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: 'Add item',
			default: {},
			options: [
				{ name: LIST_ITEMS, displayName: property.displayName, values: itemPropertiesOf(field) },
			],
		}),
		codec: {
			store: (value, field) =>
				Array.isArray(value)
					? {
							[LIST_ITEMS]: value.map((item) =>
								isRecord(item) ? storedItemOf(item, field) : item,
							),
						}
					: value,
			read: (value, field) => {
				const items = listItemsOf(value);
				if (items) return items.map((item) => (isRecord(item) ? readItemOf(item, field) : item));
				// A list without rows: an optional field is unset.
				const empty = isRecord(value) && Object.keys(value).length === 0;
				return empty ? (field.schema.isOptional ? '' : []) : value;
			},
		},
	},
	assignments: {
		render: ({ options: _options, typeOptions: _typeOptions, placeholder: _p, ...property }) => ({
			...property,
			type: 'assignmentCollection',
			// An optional field without a value stays unset, as a `json` field does.
			default: property.default === '' ? '' : {},
		}),
		codec: {
			store: (value) => (isRecord(value) && !isAssignments(value) ? assignmentsOf(value) : value),
			read: (value) => (isAssignments(value) ? recordOf(value.assignments) : value),
		},
	},
};

/** The n8n parameter of the rows of a `list` widget. */
const LIST_ITEMS = 'values';

const itemShapeOf = ({ schema }: FormField) =>
	isRecord(schema.json.items) ? shapeOf(schema.json.items) : {};

/** One row of a list: each item field, with its widget at `field.itemField`. */
const itemPropertiesOf = (field: FormField): INodeProperties[] =>
	Object.entries(itemShapeOf(field)).map(([name, child]) => ({
		...toProperty(name, child, field.fields, `${field.path}.${name}`),
		// As in a variant collection, the run checks a required item field.
		required: false,
	}));

const listItemsOf = (value: unknown): readonly unknown[] | undefined => {
	if (Array.isArray(value)) return value;
	if (!isRecord(value) || Object.keys(value).length !== 1) return undefined;
	const items = value[LIST_ITEMS];
	return Array.isArray(items) ? items : undefined;
};

const storedItemOf = (item: Readonly<Record<string, unknown>>, field: FormField) => {
	const shape = itemShapeOf(field);
	return Object.fromEntries(
		Object.entries(item).map(([name, value]) => {
			const codec = fieldCodecOf(field.fields, `${field.path}.${name}`, shape[name]);
			return [name, codec ? codec.store(value) : value];
		}),
	);
};

/** An item of a row: n8n fills each field default into a row, and `''` is an unset field. */
const readItemOf = (item: Readonly<Record<string, unknown>>, field: FormField) => {
	const shape = itemShapeOf(field);
	return Object.fromEntries(
		Object.entries(item).flatMap(([name, stored]) => {
			const child = shape[name];
			if (!child) return [[name, stored]];
			const codec = fieldCodecOf(field.fields, `${field.path}.${name}`, child);
			const value = inputReaderOf(child)(codec ? codec.read(stored) : stored);
			return value === undefined || value === '' ? [] : [[name, value]];
		}),
	);
};

/** The type of an n8n assignment for a value. The editor edits a list or an object as JSON text. */
const assignmentOf = (name: string, value: unknown, index: number) => {
	const id = String(index);
	if (typeof value === 'number' || typeof value === 'boolean') {
		return { id, name, value, type: typeof value };
	}
	if (typeof value === 'string') return { id, name, value, type: 'string' };
	return {
		id,
		name,
		value: JSON.stringify(value),
		type: Array.isArray(value) ? 'array' : 'object',
	};
};

/** The n8n assignments of a record. Each ID is its index, so a build is the same each time. */
const assignmentsOf = (record: Readonly<Record<string, unknown>>) => ({
	assignments: Object.entries(record).map(([name, value], index) =>
		assignmentOf(name, value, index),
	),
});

interface StoredAssignment {
	readonly name: string;
	readonly value?: unknown;
	readonly type?: unknown;
}

const isStoredAssignment = (value: unknown): value is StoredAssignment =>
	isRecord(value) && typeof value.name === 'string' && typeof value.id === 'string';

const isAssignments = (value: unknown): value is { assignments: StoredAssignment[] } =>
	isRecord(value) &&
	Object.keys(value).length === 1 &&
	Array.isArray(value.assignments) &&
	value.assignments.every(isStoredAssignment);

const parsedOrText = (text: string): unknown => {
	try {
		const parsed: unknown = JSON.parse(text);
		return parsed;
	} catch {
		return text;
	}
};

/** The record of n8n assignments. A list or an object typed as text reads as its JSON value. */
const recordOf = (assignments: readonly StoredAssignment[]) =>
	Object.fromEntries(
		assignments.map(({ name, value, type }) => [
			name,
			(type === 'array' || type === 'object') && typeof value === 'string' && !value.startsWith('=')
				? parsedOrText(value)
				: value,
		]),
	);

const isWidget = (name: string): name is keyof Widgets => Object.hasOwn(WIDGETS, name);

const isCodecWidget = (widget: string | undefined) =>
	widget !== undefined && isWidget(widget) && WIDGETS[widget].codec !== undefined;

/** The codec of the widget of the field at `path`, when its widget stores another form. */
function fieldCodecOf(
	fields: Readonly<Record<string, FieldUiDocument>> = {},
	path: string,
	schema: AnySchema | undefined,
): FieldCodec | undefined {
	const widget = fields[path]?.widget;
	const codec = widget !== undefined && isWidget(widget) ? WIDGETS[widget].codec : undefined;
	if (!codec || !schema) return undefined;
	const field = { schema, fields, path };
	return {
		store: (value) => codec.store(value, field),
		// A codec field holds an object or a list, which can also be JSON text.
		read: (value) => codec.read(parameterValue(value, true), field),
	};
}

/** The n8n filter operations that compare with a value of another type than the tested one. */
const RIGHT_TYPES: Readonly<Record<string, string>> = {
	contains: 'any',
	notContains: 'any',
	lengthEquals: 'number',
	lengthNotEquals: 'number',
	lengthGt: 'number',
	lengthGte: 'number',
	lengthLt: 'number',
	lengthLte: 'number',
};

/** A `where` value before validation: the run checks the conditions. */
interface WhereValue {
	readonly [key: string]: unknown;
	readonly match?: unknown;
	readonly conditions: ReadonlyArray<{
		readonly type?: unknown;
		readonly left?: unknown;
		readonly test: Readonly<Record<string, unknown>>;
	}>;
	readonly ignoreCase?: unknown;
}

const isWhere = (value: unknown): value is WhereValue =>
	isRecord(value) &&
	Array.isArray(value.conditions) &&
	value.conditions.every((entry) => isRecord(entry) && isRecord(entry.test));

/** The n8n filter value of a `where`. Each condition ID is its index, so a build is the same each time. */
const filterValueOf = ({ match, conditions, ignoreCase }: WhereValue) => ({
	conditions: conditions.map(({ type, left, test }, index) => ({
		id: String(index),
		leftValue: left === undefined ? '' : left,
		rightValue: 'right' in test ? test.right : '',
		operator: {
			type,
			operation: test.op,
			...(type === 'array' && typeof test.op === 'string' && Object.hasOwn(RIGHT_TYPES, test.op)
				? { rightType: RIGHT_TYPES[test.op] }
				: {}),
			...('right' in test ? {} : { singleValue: true }),
		},
	})),
	combinator: match === 'any' ? 'or' : 'and',
	options: {
		caseSensitive: ignoreCase !== true,
		leftValue: '',
		typeValidation: 'strict',
		version: 2,
	},
});

interface StoredCondition {
	readonly leftValue?: unknown;
	readonly rightValue?: unknown;
	readonly operator: Readonly<Record<string, unknown>>;
}

const isStoredCondition = (value: unknown): value is StoredCondition =>
	isRecord(value) && isRecord(value.operator);

const isFilterValue = (
	value: unknown,
): value is { conditions: StoredCondition[]; combinator?: unknown; options?: unknown } =>
	isRecord(value) &&
	!('match' in value) &&
	!('ignoreCase' in value) &&
	Array.isArray(value.conditions) &&
	value.conditions.every(isStoredCondition);

/**
 * The `where` of an n8n filter value. A default (`all`, case sensitive) and an empty left value
 * stay out, as in the value that the build writes.
 */
const whereOf = ({
	conditions,
	combinator,
	options,
}: {
	conditions: readonly StoredCondition[];
	combinator?: unknown;
	options?: unknown;
}) => ({
	...(combinator === 'or' ? { match: 'any' } : {}),
	conditions: conditions.map(({ leftValue, rightValue, operator }) => ({
		type: operator.type,
		...(leftValue === '' || leftValue === undefined ? {} : { left: leftValue }),
		test: {
			op: operator.operation,
			...(operator.singleValue === true ? {} : { right: rightValue }),
		},
	})),
	...(isRecord(options) && options.caseSensitive === false ? { ignoreCase: true } : {}),
});

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
		? WIDGETS[widget].render(property, config, { schema, fields, path })
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
	const resource = json['x-n8n-ref'];
	if (resource !== undefined && json.type === 'string')
		return locatorPropertyOf(base, json, resource);
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
				...(json.writeOnly ? { typeOptions: { password: true } } : {}),
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

/**
 * A `ref` field is a resource locator: a list of the resources when the resource has a lookup,
 * and the ID. The host generates the list method from the lookup, named by the resource id.
 */
function locatorPropertyOf(
	base: Pick<INodeProperties, 'displayName' | 'name' | 'required' | 'description' | 'placeholder'>,
	json: JsonSchema,
	resource: string,
): INodeProperties {
	const lookup = json['x-n8n-lookup'];
	const { placeholder, ...rest } = base;
	const parents = lookup?.input ?? [];
	return {
		...rest,
		type: 'resourceLocator',
		default: {
			mode: lookup ? 'list' : 'id',
			value: typeof json.default === 'string' ? json.default : '',
		},
		modes: [
			...(lookup
				? [
						{
							displayName: 'From List',
							name: 'list',
							type: 'list' as const,
							typeOptions: {
								searchListMethod: resource,
								searchable: lookup.search !== undefined,
							},
						},
					]
				: []),
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string' as const,
				...(placeholder === undefined ? {} : { placeholder }),
			},
		],
		...(parents.length > 0 ? { typeOptions: { loadOptionsDependsOn: [...parents] } } : {}),
	};
}

/**
 * The value of a resource locator parameter, or the parameter value as it is. As n8n core reads
 * it, a filled-in default `{ mode, value }` has no `__rl` flag.
 */
export const locatorValueOf = (value: unknown): unknown =>
	isRecord(value) && 'mode' in value && 'value' in value ? value.value : value;

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
		if (type === 'resourceLocator') return locatorValueOf;
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
