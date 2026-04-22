import { z } from 'zod';

export interface ZodClass<T = unknown, Shape extends z.ZodRawShape = z.ZodRawShape> {
	new (data: T): T;
	schema: z.ZodObject<Shape>;
	safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
	parse(data: unknown): T;
	extend<U extends z.ZodRawShape>(shape: U): ZodClass<T & z.infer<z.ZodObject<U>>, Shape & U>;
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
export const Z = {
	class: <T extends z.ZodRawShape>(shape: T): ZodClass<z.objectOutputType<T, z.ZodTypeAny>, T> => {
		const schema = z.object(shape);
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
				return Z.class({ ...shape, ...additionalShape });
			}
		};

		return DtoClass as unknown as ZodClass<Output, T>;
	},
};
