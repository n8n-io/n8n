//#region ../langchain-core/dist/messages/utils.d.ts

/**
 * Extracts the explicitly declared keys from a type T.
 *
 * @template T - The type to extract keys from
 * @returns A union of keys that are not string, number, or symbol
 */
type $KnownKeys<T$1> = { [K in keyof T$1]: string extends K ? never : number extends K ? never : symbol extends K ? never : K }[keyof T$1];
/**
 * Detects if T has an index signature.
 *
 * @template T - The type to check for index signatures
 * @returns True if T has an index signature, false otherwise
 */
type $HasIndexSignature<T$1> = string extends keyof T$1 ? true : number extends keyof T$1 ? true : symbol extends keyof T$1 ? true : false;
/**
 * Detects if T has an index signature and no known keys.
 *
 * @template T - The type to check for index signatures and no known keys
 * @returns True if T has an index signature and no known keys, false otherwise
 */
type $OnlyIndexSignatures<T$1> = $HasIndexSignature<T$1> extends true ? [$KnownKeys<T$1>] extends [never] ? true : false : false;
/**
 * Recursively merges two object types T and U, with U taking precedence over T.
 *
 * This utility type performs a deep merge of two object types:
 * - For keys that exist in both T and U:
 *   - If both values are objects (Record<string, unknown>), recursively merge them
 *   - Otherwise, U's value takes precedence
 * - For keys that exist only in T, use T's value
 * - For keys that exist only in U, use U's value
 *
 * @template T - The first object type to merge
 * @template U - The second object type to merge (takes precedence over T)
 *
 * @example
 * ```ts
 * type ObjectA = {
 *   shared: { a: string; b: number };
 *   onlyInA: boolean;
 * };
 *
 * type ObjectB = {
 *   shared: { b: string; c: Date };
 *   onlyInB: symbol;
 * };
 *
 * type Merged = $MergeObjects<ObjectA, ObjectB>;
 * // Result: {
 * //   shared: { a: string; b: string; c: Date };
 * //   onlyInA: boolean;
 * //   onlyInB: symbol;
 * // }
 * ```
 */
type $MergeObjects<T$1, U$1> =
// If U is purely index-signature based, prefer U as a whole
$OnlyIndexSignatures<U$1> extends true ? U$1 : $OnlyIndexSignatures<T$1> extends true ? U$1 : { [K in keyof T$1 | keyof U$1]: K extends keyof T$1 ? K extends keyof U$1 ? T$1[K] extends Record<string, unknown> ? U$1[K] extends Record<string, unknown> ? $MergeObjects<T$1[K], U$1[K]> : U$1[K] : U$1[K] : T$1[K] : K extends keyof U$1 ? U$1[K] : never };
/**
 * Merges two discriminated unions A and B based on a discriminator key (defaults to "type").
 * For each possible value of the discriminator across both unions:
 * - If B has a member with that discriminator value, use B's member
 * - Otherwise use A's member with that discriminator value
 * This effectively merges the unions while giving B's members precedence over A's members.
 *
 * @template A - First discriminated union type that extends Record<Key, PropertyKey>
 * @template B - Second discriminated union type that extends Record<Key, PropertyKey>
 * @template Key - The discriminator key property, defaults to "type"
 */
type $MergeDiscriminatedUnion<A extends Record<Key, PropertyKey>, B extends Record<Key, PropertyKey>, Key extends PropertyKey = "type"> = { [T in A[Key] | B[Key]]: [Extract<B, Record<Key, T>>] extends [never] // Check if B has a member with this discriminator value
? Extract<A, Record<Key, T>> : [Extract<A, Record<Key, T>>] extends [never] ? Extract<B, Record<Key, T>> : $MergeObjects<Extract<A, Record<Key, T>>, Extract<B, Record<Key, T>>> }[A[Key] | B[Key]];
//#endregion
export { $MergeDiscriminatedUnion, $MergeObjects };
//# sourceMappingURL=utils.d.ts.map