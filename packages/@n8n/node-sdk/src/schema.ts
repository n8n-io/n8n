/**
 * Schema builders. Each builder emits JSON Schema (2020-12 subset plus closed `x-n8n-*`
 * keywords) and carries the TypeScript type of the value it describes, so one declaration
 * drives the contract document, the runtime validator, and the `run()` input type.
 */

export interface JsonSchema {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
	/** The label n8n shows for the field, e.g. `API Key`. The field name when not set. */
	title?: string;
	description?: string;
	enum?: readonly unknown[];
	const?: unknown;
	default?: unknown;
	format?: string;
	minLength?: number;
	minimum?: number;
	maximum?: number;
	pattern?: string;
	minItems?: number;
	/** A secret: n8n stores and sends it, and never shows or returns it. */
	writeOnly?: boolean;
	/** n8n sets the value, not the user. The form hides it. */
	readOnly?: boolean;
	properties?: Record<string, JsonSchema>;
	required?: readonly string[];
	additionalProperties?: boolean | JsonSchema;
	patternProperties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	oneOf?: readonly JsonSchema[];
	anyOf?: readonly JsonSchema[];
	discriminator?: { propertyName: string };
	/** Footgun hint, at most 80 characters. */
	'x-n8n-hint'?: string;
	/** The value must be a literal, never an expression (discriminators, binary keys). */
	'x-n8n-literal'?: boolean;
	/** A resource reference, e.g. `notion.database`. */
	'x-n8n-ref'?: string;
	/** Each output item is an input item, passed on unchanged, so it keeps the input item type. */
	'x-n8n-passed'?: boolean;
	/** Value types by source type (Notion property type), for open `patternProperties`. */
	'x-n8n-value-types'?: Record<string, JsonSchema>;
	/** A file in the n8n binary data store. `run()` gets and gives a `Binary` handle. */
	'x-n8n-binary'?: true;
	/** A capability a sub-node supplies through an `ai_*` connection, e.g. `chatModel`. */
	'x-n8n-supply'?: string;
	/** A model ID of this provider in the model catalog (models.dev), e.g. `openai`. */
	'x-n8n-model-catalog'?: string;
	/** A trigger output field whose JSON Schema the workflow declares, e.g. a webhook body. */
	'x-n8n-declared'?: true;
	/** On a trigger output: one more field per entry of an input list, e.g. per form field. */
	'x-n8n-entry-fields'?: EntryFields;
	/** The label and description of each `enum` value. */
	'x-n8n-options'?: Readonly<Record<string, OptionLabel>>;
	/** A hidden credential field that holds the base URL of its credential type. */
	'x-n8n-base-url'?: true;
	/** Sample values; the first one seeds verification fixtures. */
	examples?: readonly unknown[];
}

export interface OptionLabel {
	readonly name: string;
	readonly description?: string;
}

/** Output fields that the entries of an input list name, e.g. one field per form field. */
export interface EntryFields {
	/** The path of the list in the input, e.g. `['formFields', 'values']`. */
	readonly list: readonly string[];
	/** The entry fields that name the output field. The first one that is set wins. */
	readonly key: readonly string[];
	/** The entry field whose value picks the type of the output field. */
	readonly type: string;
	readonly types: Readonly<Record<string, JsonSchema>>;
	/** The type for any other entry type. */
	readonly fallback: JsonSchema;
	/** The boolean entry field that makes the value never `null`. */
	readonly required?: string;
}

declare const phantom: unique symbol;
declare const hasDefault: unique symbol;

/**
 * A schema for values of type `T`. `Opt` marks a field the author may omit. `Def` is `true`
 * only after `.default(v)`: n8n fills in the default, so `run()` always gets the field.
 */
export class Schema<T, Opt extends boolean = false, Def extends boolean = boolean> {
	declare readonly [phantom]?: T;
	declare readonly [hasDefault]?: Def;

	constructor(
		readonly json: JsonSchema,
		readonly isOptional: Opt,
	) {}

	optional(): Schema<T, true> {
		return new Schema<T, true>(this.json, true);
	}

	/** A default value also makes the field optional. */
	default(value: T): Schema<T, true, true> {
		return new Schema<T, true, true>({ ...this.json, default: value }, true);
	}

	hint(text: string): Schema<T, Opt, Def> {
		return new Schema<T, Opt, Def>({ ...this.json, 'x-n8n-hint': text }, this.isOptional);
	}

	describe(text: string): Schema<T, Opt, Def> {
		return new Schema<T, Opt, Def>({ ...this.json, description: text }, this.isOptional);
	}

	/** Extra JSON Schema keywords (`pattern`, `minLength`, `format`, …). */
	with(keywords: JsonSchema): Schema<T, Opt, Def> {
		return new Schema<T, Opt, Def>({ ...this.json, ...keywords }, this.isOptional);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches any schema in constraints
export type AnySchema = Schema<any, boolean>;
export type Shape = Record<string, AnySchema>;
export type Infer<S> = S extends Schema<infer T, boolean> ? T : never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type RequiredKeys<S extends Shape> = {
	[K in keyof S]: S[K] extends Schema<unknown, true> ? never : K;
}[keyof S];
type OptionalKeys<S extends Shape> = Exclude<keyof S, RequiredKeys<S>>;
export type ObjectOf<S extends Shape> = Simplify<
	{ [K in RequiredKeys<S>]: Infer<S[K]> } & { [K in OptionalKeys<S>]?: Infer<S[K]> }
>;

export const str = () => new Schema<string>({ type: 'string' }, false);
export const num = () => new Schema<number>({ type: 'number' }, false);
export const int = () => new Schema<number>({ type: 'integer' }, false);
export const bool = () => new Schema<boolean>({ type: 'boolean' }, false);

export const lit = <const V extends string | number | boolean>(value: V) =>
	new Schema<V>({ const: value, 'x-n8n-literal': true }, false);

export const oneOf = <const V extends readonly string[]>(...values: V) =>
	new Schema<V[number]>({ enum: values }, false);

export const arr = <S extends AnySchema>(items: S) =>
	new Schema<ReadonlyArray<Infer<S>>>({ type: 'array', items: items.json }, false);

/** The value or `null`. Use it in output schemas, e.g. `assignee: nullable(str())`. */
export const nullable = <T, Opt extends boolean>(schema: Schema<T, Opt>) =>
	new Schema<T | null, Opt>({ anyOf: [schema.json, { type: 'null' }] }, schema.isOptional);

function objectJson(shape: Shape, extra: JsonSchema = {}): JsonSchema {
	const required = Object.entries(shape)
		.filter(([, schema]) => !schema.isOptional)
		.map(([key]) => key);
	return {
		type: 'object',
		properties: Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, value.json])),
		...(required.length > 0 ? { required } : {}),
		additionalProperties: false,
		...extra,
	};
}

export const obj = <S extends Shape>(shape: S) => new Schema<ObjectOf<S>>(objectJson(shape), false);

/** A value that matches one of the schemas, e.g. output shapes that depend on an input. */
export const union = <const S extends readonly AnySchema[]>(...schemas: S) =>
	new Schema<Infer<S[number]>>({ anyOf: schemas.map((schema) => schema.json) }, false);

/** An object with arbitrary keys. */
export const record = <S extends AnySchema>(values: S) =>
	new Schema<Record<string, Infer<S>>>(
		{ type: 'object', additionalProperties: values.json },
		false,
	);

/** Any JSON value; it is not checked. */
export const jsonValue = () => new Schema<unknown>({}, false);

/** The output of an action that passes input items on unchanged (filter, sort, route). */
export const passedItem = () =>
	new Schema<Record<string, unknown>>(
		{ type: 'object', additionalProperties: true, 'x-n8n-passed': true },
		false,
	);

/** Any JSON object; its fields are not checked. */
export const json = () =>
	new Schema<Record<string, unknown>>({ type: 'object', additionalProperties: true }, false);

/**
 * A trigger output field whose shape the workflow declares, e.g. the body a webhook receives.
 * The typed flow takes its JSON Schema in `schema`. Without one, it is any JSON object.
 */
export const declared = () =>
	new Schema<Record<string, unknown>>(
		{ type: 'object', additionalProperties: true, 'x-n8n-declared': true },
		false,
	);

type VariantOf<Tag extends string, B extends Record<string, Shape>> = {
	[K in keyof B & string]: Simplify<{ [P in Tag]: K } & ObjectOf<B[K]>>;
}[keyof B & string];

/**
 * A tagged union. The tag is a literal selector, so each branch lists only the fields it
 * needs, and a field is never conditionally required.
 */
export function variant<const Tag extends string, B extends Record<string, Shape>>(
	tag: Tag,
	branches: B,
): Schema<VariantOf<Tag, B>> {
	return new Schema<VariantOf<Tag, B>>(
		{
			type: 'object',
			discriminator: { propertyName: tag },
			oneOf: Object.entries(branches).map(([name, shape]) =>
				objectJson({ [tag]: lit(name), ...shape }),
			),
		},
		false,
	);
}

/** What n8n knows about a file without reading it. */
export interface BinaryMeta {
	readonly mimeType: string;
	readonly fileName?: string;
	/** The size in bytes, when the host knows it. */
	readonly bytes?: number;
}

/**
 * A host handle to a file in the n8n binary data store. Pass it on as an output field or as
 * an `http.request` body, so the bytes never enter the action. Read it only to change bytes.
 */
export interface Binary {
	readonly meta: BinaryMeta;
	/** The bytes in chunks, from the first byte. Each call reads again. */
	read(): AsyncIterable<Uint8Array>;
}

/**
 * A file. In `input`, the user names a binary of the input item; `run()` gets its handle. In
 * `output`, a top-level field becomes a binary of the output item under the same name.
 */
export const binary = () => new Schema<Binary>({ 'x-n8n-binary': true }, false);

/** The schema or one of its sub-schemas is a `binary()`. */
export const hasBinary = (schema: JsonSchema): boolean =>
	schema['x-n8n-binary'] === true ||
	[
		...Object.values(schema.properties ?? {}),
		...Object.values(schema.patternProperties ?? {}),
		...(schema.items ? [schema.items] : []),
		...(schema.oneOf ?? []),
		...(schema.anyOf ?? []),
		...(typeof schema.additionalProperties === 'object' ? [schema.additionalProperties] : []),
	].some(hasBinary);

/** A resource the user owns (a database, a channel), checked against its ID shape. */
export interface Resource {
	readonly id: string;
	readonly label: string;
	readonly shape: JsonSchema;
}

export const defineResource = (resource: Resource): Resource => resource;

export const ref = (resource: Resource) =>
	new Schema<string>({ type: 'string', ...resource.shape, 'x-n8n-ref': resource.id }, false);
