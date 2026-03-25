/**
 * A "branded type" is a primitive type with a compile-type key that makes it incompatible with other
 * aliases for the primitive type.
 *
 * @remarks
 *
 * Example usage:
 *
 * ```ts
 * // PhoneNumber is a branded type based on the "string" primitive.
 * type PhoneNumber = Brand<string, 'PhoneNumber'>;
 *
 * function createPhoneNumber(input: string): PhoneNumber {
 *   if (!/\d+(\-\d+)+/.test(input)) {
 *     throw new Error('Invalid phone number: ' + JSON.stringify(input));
 *   }
 *   return input as PhoneNumber;
 * }
 *
 * const p1: PhoneNumber = createPhoneNumber('123-456-7890');
 *
 * // PhoneNumber is a string and can be used as one:
 * const p2: string = p1;
 *
 * // But an arbitrary string cannot be implicitly type cast as PhoneNumber.
 * // ERROR: Type 'string' is not assignable to type 'PhoneNumber'
 * const p3: PhoneNumber = '123-456-7890';
 * ```
 *
 * For more information about this pattern, see {@link
 * https://github.com/Microsoft/TypeScript/blob/7b48a182c05ea4dea81bab73ecbbe9e013a79e99/src/compiler/types.ts#L693-L698
 * | this comment} explaining the TypeScript compiler's introduction of this pattern, and
 * {@link https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/ | this article}
 * explaining the technique in depth.
 *
 * @public
 */
export type Brand<T, BrandTag extends string> = T & {
    __brand: BrandTag;
};
//# sourceMappingURL=PrimitiveTypes.d.ts.map