import { z } from 'zod';

export interface ZodClass<T = unknown, Shape extends z.ZodRawShape = z.ZodRawShape> {
	new (data: T): T;
	schema: z.ZodObject<Shape>;
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
 * ```
 */
const dtoClassFor = <T extends z.ZodRawShape, Unknown extends z.UnknownKeysParam>(
	shape: T,
	schema: z.ZodObject<T, Unknown>,
): ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T> => {
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
			return schema.parse(data) as Output;
		}

		static extend<U extends z.ZodRawShape>(additionalShape: U) {
			return dtoClassFor({ ...shape, ...additionalShape }, schema.extend(additionalShape));
		}
	};

	return DtoClass as unknown as ZodClass<Output, T>;
};

export const Z = {
	class: <T extends z.ZodRawShape>(shape: T): ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T> =>
		dtoClassFor(shape, z.object(shape)),

	/** Like `Z.class`, but an unknown key fails validation instead of being stripped. */
	strictClass: <T extends z.ZodRawShape>(
		shape: T,
	): ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T> =>
		dtoClassFor(shape, z.object(shape).strict()),

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
};
