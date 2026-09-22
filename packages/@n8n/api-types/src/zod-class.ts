import { z } from 'zod';

export interface ZodClass<T = unknown, Shape extends z.ZodRawShape = z.ZodRawShape> {
	new (data: T): T;
	schema: z.ZodObject<Shape, 'strip' | 'strict' | 'passthrough'>;
	safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
	parse(data: unknown): T;
	extend<U extends z.ZodRawShape>(shape: U): ZodClass<T & z.infer<z.ZodObject<U>>, Shape & U>;
}

export interface ZodArrayClass<T, Item extends z.ZodTypeAny = z.ZodTypeAny> {
	new (data: T): T;
	schema: z.ZodArray<Item>;
	safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
	parse(data: unknown): T;
}

export interface ZodUnionClass<T> {
	new (data: T): T;
	schema: z.ZodTypeAny;
	name: string;
	safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
	parse(data: unknown): T;
}

/**
 * Replacement for: https://www.npmjs.com/package/zod-class
 *
 * Creates a class with static `.parse()` and `.safeParse()` methods,
 * compatible with reflection-based validation in the controller registry.
 *
 * Usage is identical to `zod-class`.
 *
 * ```ts
 * export class LoginDto extends Z.class({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * }) {}
 *
 * // Inheritance via extend:
 * export class ChildDto extends ParentDto.extend({
 *   additionalField: z.string(),
 * }) {}
 *
 * export class StrictDto extends Z.class({ email: z.string() }, { strict: true }) {}
 *
 * // Keeps unknown keys instead of stripping them, for a shape with user-defined columns:
 * export class PassthroughDto extends Z.class({ id: z.string() }, { passthrough: true }) {}
 * ```
 */
export const Z = {
	class: <T extends z.ZodRawShape>(
		shape: T,
		options: { strict?: boolean; passthrough?: boolean } = {},
	): ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T> => {
		const schema = options.strict
			? z.object(shape).strict()
			: options.passthrough
				? z.object(shape).passthrough()
				: z.object(shape);
		type Output = z.objectOutputType<T, z.ZodTypeAny>;

		const DtoClass = class {
			static schema = schema;

			constructor(data: Output) {
				const parsed = schema.parse(data);
				Object.assign(this, parsed);
			}

			static safeParse(data: unknown) {
				return schema.safeParse(data);
			}

			static parse(data: unknown): Output {
				return schema.parse(data);
			}

			static extend<U extends z.ZodRawShape>(additionalShape: U) {
				return Z.class({ ...shape, ...additionalShape }, options);
			}
		};

		return DtoClass as ZodClass<Output, T>;
	},

	/**
	 * Array-rooted counterpart to `Z.class`, for endpoints whose request body or response is a bare
	 * JSON array rather than an object. Same usage as `Z.class`:
	 *
	 * ```ts
	 * export class TagIdsPublicDto extends Z.array(z.object({ id: z.string() })) {}
	 * ```
	 */
	array: <Item extends z.ZodTypeAny>(
		itemSchema: Item,
	): ZodArrayClass<Array<z.infer<Item>>, Item> => {
		const schema = z.array(itemSchema);
		type Output = Array<z.infer<Item>>;

		const ArrayDtoClass = class {
			static schema = schema;

			constructor(data: Output) {
				return schema.parse(data);
			}

			static safeParse(data: unknown) {
				return schema.safeParse(data);
			}

			static parse(data: unknown): Output {
				return schema.parse(data);
			}
		};

		return ArrayDtoClass as unknown as ZodArrayClass<Output, Item>;
	},

	/**
	 * Union-rooted counterpart to `Z.class`, for a response shaped differently depending on the
	 * request (e.g. a flag that switches between a boolean and a list). `Z.class` can only build a
	 * `z.object`, so a union schema needs this instead.
	 *
	 * A union type can include a non-object member (e.g. `z.literal(true)`), so - unlike
	 * `Z.class`/`Z.array` - the result cannot be used as a base class via `extends`: TypeScript
	 * requires a base constructor to return a single object type. Assign it to a `const` instead,
	 * and pass a name explicitly since there is no class declaration for the OpenAPI generator to
	 * read one off:
	 *
	 * ```ts
	 * export const RowsOrTrueDto = Z.union(
	 *   'RowsOrTrueDto',
	 *   z.union([z.literal(true), z.array(rowSchema)]),
	 * );
	 * ```
	 */
	union: <T extends z.ZodTypeAny>(name: string, schema: T): ZodUnionClass<z.infer<T>> => {
		type Output = z.infer<T>;

		const UnionDtoClass = class {
			static schema = schema;

			constructor(data: Output) {
				return schema.parse(data);
			}

			static safeParse(data: unknown) {
				return schema.safeParse(data);
			}

			static parse(data: unknown): Output {
				return schema.parse(data);
			}
		};

		Object.defineProperty(UnionDtoClass, 'name', { value: name, configurable: true });

		return UnionDtoClass;
	},
};
