/**
 * Schema builders. Each builder emits JSON Schema (2020-12 subset plus closed `x-n8n-*`
 * keywords) and carries the TypeScript type of the value it describes, so one declaration
 * drives the contract document, the runtime validator, and the `run()` input type.
 */

export interface JsonSchema {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
	/** The label a form shows, e.g. a credential field. The key is the label when it is not set. */
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
	/** Value types by source type (Notion property type), for open `patternProperties`. */
	'x-n8n-value-types'?: Record<string, JsonSchema>;
	/** Sample values; the first one seeds verification fixtures. */
	examples?: readonly unknown[];
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

/** Any JSON object; its fields are not checked. */
export const json = () =>
	new Schema<Record<string, unknown>>({ type: 'object', additionalProperties: true }, false);

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

/** A resource the user owns (a database, a channel), checked against its ID shape. */
export interface Resource {
	readonly id: string;
	readonly label: string;
	readonly shape: JsonSchema;
}

export const defineResource = (resource: Resource): Resource => resource;

export const ref = (resource: Resource) =>
	new Schema<string>({ type: 'string', ...resource.shape, 'x-n8n-ref': resource.id }, false);
