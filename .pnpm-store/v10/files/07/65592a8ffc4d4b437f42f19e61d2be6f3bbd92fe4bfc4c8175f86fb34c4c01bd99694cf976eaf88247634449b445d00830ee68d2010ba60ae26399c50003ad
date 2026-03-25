/**
 * The `P` module contains patterns for primitive types, wildcards and
 * other pattern-matching utilities.
 *
 * @module
 */
import * as symbols from './internals/symbols.cjs';
import { matcher } from './internals/symbols.cjs';
import { ExtractPreciseValue } from './types/ExtractPreciseValue.cjs';
import { Fn } from './types/helpers.cjs';
import { InvertPattern } from './types/InvertPattern.cjs';
import { Pattern, UnknownPattern, OptionalP, ArrayP, MapP, SetP, AndP, OrP, NotP, GuardP, SelectP, AnonymousSelectP, GuardExcludeP, CustomP, StringPattern, AnyPattern, NumberPattern, BooleanPattern, BigIntPattern, NullishPattern, SymbolPattern, Chainable, ArrayChainable, NonNullablePattern } from './types/Pattern.cjs';
export type { 
/**
 * `Pattern<T>` is the type of all patterns
 * that can match a value of type `T`.
 */
Pattern, 
/**
 * `unstable_Fn` can be used to created a
 * a Matchable instance – a custom type that
 * can be used as a pattern.
 *
 * @experimental This feature is unstable.
 */
Fn as unstable_Fn, };
export { matcher };
/**
 * A `Matchable` is an object implementing
 * the Matcher Protocol. It must have a `[P.matcher]: P.Matcher<NarrowFn>`
 * key, which defines how this object should be matched by TS-Pattern.
 *
 * @experimental This feature is unstable.
 *
 * @example
 * ```ts
 * class Some<T> implements P.unstable_Matchable {
 *  [P.matcher](): P.unstable_Matcher<Some<T>>
 * }
 * ```
 */
export type unstable_Matchable<narrowedOrFn, input = unknown, pattern = never> = CustomP<input, pattern, narrowedOrFn>;
/**
 * A `Matcher` is an object with `match` function, which
 * defines how this object should be matched by TS-Pattern.
 *
 * @experimental This feature is unstable.
 *
 * @example
 * ```ts
 * class Some<T> implements P.unstable_Matchable {
 *  [P.matcher](): P.unstable_Matcher<Some<T>>
 * }
 * ```
 */
export type unstable_Matcher<narrowedOrFn, input = unknown, pattern = never> = ReturnType<CustomP<input, pattern, narrowedOrFn>[matcher]>;
/**
 * `P.infer<typeof somePattern>` will return the type of the value
 * matched by this pattern.
 *
 * [Read the documentation for `P.infer` on GitHub](https://github.com/gvergnaud/ts-pattern#pinfer)
 *
 * @example
 * const userPattern = { name: P.string }
 * type User = P.infer<typeof userPattern>
 */
export type infer<pattern> = InvertPattern<NoInfer<pattern>, unknown>;
/**
 * `P.narrow<Input, Pattern>` will narrow the input type to only keep
 * the set of values that are compatible with the provided pattern type.
 *
 * [Read the documentation for `P.narrow` on GitHub](https://github.com/gvergnaud/ts-pattern#pnarrow)
 *
 * @example
 * type Input = ['a' | 'b' | 'c', 'a' | 'b' | 'c']
 * const Pattern = ['a', P.union('a', 'b')] as const
 *
 * type Narrowed = P.narrow<Input, typeof Pattern>
 * //     ^? ['a', 'a' | 'b']
 */
export type narrow<input, pattern> = ExtractPreciseValue<input, InvertPattern<pattern, input>>;
/**
 * `P.optional(subpattern)` takes a sub pattern and returns a pattern which matches if the
 * key is undefined or if it is defined and the sub pattern matches its value.
 *
 * [Read the documentation for `P.optional` on GitHub](https://github.com/gvergnaud/ts-pattern#poptional-patterns)
 *
 * @example
 *  match(value)
 *   .with({ greeting: P.optional('Hello') }, () => 'will match { greeting?: "Hello" }')
 */
export declare function optional<input, const pattern extends unknown extends input ? UnknownPattern : Pattern<input>>(pattern: pattern): Chainable<OptionalP<input, pattern>, 'optional'>;
type UnwrapArray<xs> = xs extends readonly (infer x)[] ? x : never;
type UnwrapSet<xs> = xs extends Set<infer x> ? x : never;
type UnwrapMapKey<xs> = xs extends Map<infer k, any> ? k : never;
type UnwrapMapValue<xs> = xs extends Map<any, infer v> ? v : never;
type WithDefault<a, b> = [a] extends [never] ? b : a;
/**
 * `P.array(subpattern)` takes a sub pattern and returns a pattern, which matches
 * arrays if all their elements match the sub pattern.
 *
 * [Read the documentation for `P.array` on GitHub](https://github.com/gvergnaud/ts-pattern#parray-patterns)
 *
 * @example
 *  match(value)
 *   .with({ users: P.array({ name: P.string }) }, () => 'will match { name: string }[]')
 */
export declare function array<input>(): ArrayChainable<ArrayP<input, unknown>>;
export declare function array<input, const pattern extends Pattern<WithDefault<UnwrapArray<input>, unknown>>>(pattern: pattern): ArrayChainable<ArrayP<input, pattern>>;
/**
 * `P.set(subpattern)` takes a sub pattern and returns a pattern that matches
 * sets if all their elements match the sub pattern.
 *
 * [Read `P.set` documentation on GitHub](https://github.com/gvergnaud/ts-pattern#pset-patterns)
 *
 * @example
 *  match(value)
 *   .with({ users: P.set(P.string) }, () => 'will match Set<string>')
 */
export declare function set<input>(): Chainable<SetP<input, unknown>>;
export declare function set<input, const pattern extends Pattern<WithDefault<UnwrapSet<input>, unknown>>>(pattern: pattern): Chainable<SetP<input, pattern>>;
/**
 * `P.map(keyPattern, valuePattern)` takes a subpattern to match against the
 * key, a subpattern to match against the value and returns a pattern that
 * matches on maps where all elements inside the map match those two
 * subpatterns.
 *
 * [Read `P.map` documentation on GitHub](https://github.com/gvergnaud/ts-pattern#pmap-patterns)
 *
 * @example
 *  match(value)
 *   .with({ users: P.map(P.map(P.string, P.number)) }, (map) => `map's type is Map<string, number>`)
 */
export declare function map<input>(): Chainable<MapP<input, unknown, unknown>>;
export declare function map<input, const pkey extends Pattern<WithDefault<UnwrapMapKey<input>, unknown>>, const pvalue extends Pattern<WithDefault<UnwrapMapValue<input>, unknown>>>(patternKey: pkey, patternValue: pvalue): Chainable<MapP<input, pkey, pvalue>>;
/**
 * `P.intersection(...patterns)` returns a pattern which matches
 * only if **every** patterns provided in parameter match the input.
 *
 * [Read the documentation for `P.intersection` on GitHub](https://github.com/gvergnaud/ts-pattern#pintersection-patterns)
 *
 * @example
 *  match(value)
 *   .with(
 *     {
 *       user: P.intersection(
 *         { firstname: P.string },
 *         { lastname: P.string },
 *         { age: P.when(age => age > 21) }
 *       )
 *     },
 *     ({ user }) => 'will match { firstname: string, lastname: string, age: number } if age > 21'
 *   )
 */
export declare function intersection<input, const patterns extends readonly [Pattern<input>, ...Pattern<input>[]]>(...patterns: patterns): Chainable<AndP<input, patterns>>;
/**
 * `P.union(...patterns)` returns a pattern which matches
 * if **at least one** of the patterns provided in parameter match the input.
 *
 * [Read the documentation for `P.union` on GitHub](https://github.com/gvergnaud/ts-pattern#punion-patterns)
 *
 * @example
 *  match(value)
 *   .with(
 *     { type: P.union('a', 'b', 'c') },
 *     ({ type }) => 'will match { type: "a" | "b" | "c" }'
 *   )
 */
export declare function union<input, const patterns extends readonly [Pattern<input>, ...Pattern<input>[]]>(...patterns: patterns): Chainable<OrP<input, patterns>>;
/**
 * `P.not(pattern)` returns a pattern which matches if the sub pattern
 * doesn't match.
 *
 * [Read the documentation for `P.not` on GitHub](https://github.com/gvergnaud/ts-pattern#pnot-patterns)
 *
 * @example
 *  match<{ a: string | number }>(value)
 *   .with({ a: P.not(P.string) }, (x) => 'will match { a: number }'
 *   )
 */
export declare function not<input, const pattern extends Pattern<input> | UnknownPattern>(pattern: pattern): Chainable<NotP<input, pattern>>;
/**
 * `P.when((value) => boolean)` returns a pattern which matches
 * if the predicate returns true for the current input.
 *
 * [Read the documentation for `P.when` on GitHub](https://github.com/gvergnaud/ts-pattern#pwhen-patterns)
 *
 * @example
 *  match<{ age: number }>(value)
 *   .with({ age: P.when(age => age > 21) }, (x) => 'will match if value.age > 21'
 *   )
 */
export declare function when<input, predicate extends (value: input) => unknown>(predicate: predicate): GuardP<input, predicate extends (value: any) => value is infer narrowed ? narrowed : never>;
export declare function when<input, narrowed extends input, excluded>(predicate: (input: input) => input is narrowed): GuardExcludeP<input, narrowed, excluded>;
/**
 * `P.select()` is a pattern which will always match,
 * and will inject the selected piece of input in the handler function.
 *
 * [Read the documentation for `P.select` on GitHub](https://github.com/gvergnaud/ts-pattern#pselect-patterns)
 *
 * @example
 *  match<{ age: number }>(value)
 *   .with({ age: P.select() }, (age) => 'age: number'
 *   )
 */
export declare function select(): Chainable<AnonymousSelectP, 'select' | 'or' | 'and'>;
export declare function select<input, const patternOrKey extends string | (unknown extends input ? UnknownPattern : Pattern<input>)>(patternOrKey: patternOrKey): patternOrKey extends string ? Chainable<SelectP<patternOrKey, 'select' | 'or' | 'and'>> : Chainable<SelectP<symbols.anonymousSelectKey, input, patternOrKey>, 'select' | 'or' | 'and'>;
export declare function select<input, const pattern extends unknown extends input ? UnknownPattern : Pattern<input>, const k extends string>(key: k, pattern: pattern): Chainable<SelectP<k, input, pattern>, 'select' | 'or' | 'and'>;
type AnyConstructor = abstract new (...args: any[]) => any;
/**
 * `P.any` is a wildcard pattern, matching **any value**.
 *
 * [Read the documentation for `P.any` on GitHub](https://github.com/gvergnaud/ts-pattern#p_-wildcard)
 *
 * @example
 *  match(value)
 *   .with(P.any, () => 'will always match')
 */
export declare const any: AnyPattern;
/**
 * `P._` is a wildcard pattern, matching **any value**.
 * It's an alias to `P.any`.
 *
 * [Read the documentation for `P._` on GitHub](https://github.com/gvergnaud/ts-pattern#p_-wildcard)
 *
 * @example
 *  match(value)
 *   .with(P._, () => 'will always match')
 */
export declare const _: AnyPattern;
/**
 * `P.string` is a wildcard pattern, matching any **string**.
 *
 * [Read the documentation for `P.string` on GitHub](https://github.com/gvergnaud/ts-pattern#pstring-wildcard)
 *
 * @example
 *  match(value)
 *   .with(P.string, () => 'will match on strings')
 */
export declare const string: StringPattern;
/**
 * `P.number` is a wildcard pattern, matching any **number**.
 *
 * [Read the documentation for `P.number` on GitHub](https://github.com/gvergnaud/ts-pattern#pnumber-wildcard)
 *
 * @example
 *  match(value)
 *   .with(P.number, () => 'will match on numbers')
 */
export declare const number: NumberPattern;
/**
 * `P.bigint` is a wildcard pattern, matching any **bigint**.
 *
 * [Read the documentation for `P.bigint` on GitHub](https://github.com/gvergnaud/ts-pattern#number-wildcard)
 *
 * @example
 *   .with(P.bigint, () => 'will match on bigints')
 */
export declare const bigint: BigIntPattern;
/**
 * `P.boolean` is a wildcard pattern, matching any **boolean**.
 *
 * [Read the documentation for `P.boolean` on GitHub](https://github.com/gvergnaud/ts-pattern#boolean-wildcard)
 *
 * @example
 *   .with(P.boolean, () => 'will match on booleans')
 */
export declare const boolean: BooleanPattern;
/**
 * `P.symbol` is a wildcard pattern, matching any **symbol**.
 *
 * [Read the documentation for `P.symbol` on GitHub](https://github.com/gvergnaud/ts-pattern#symbol-wildcard)
 *
 * @example
 *   .with(P.symbol, () => 'will match on symbols')
 */
export declare const symbol: SymbolPattern;
/**
 * `P.nullish` is a wildcard pattern, matching **null** or **undefined**.
 *
 * [Read the documentation for `P.nullish` on GitHub](https://github.com/gvergnaud/ts-pattern#nullish-wildcard)
 *
 * @example
 *   .with(P.nullish, (x) => `${x} is null or undefined`)
 */
export declare const nullish: NullishPattern;
/**
 * `P.nonNullable` is a wildcard pattern, matching everything except **null** or **undefined**.
 *
 * [Read the documentation for `P.nonNullable` on GitHub](https://github.com/gvergnaud/ts-pattern#nonNullable-wildcard)
 *
 * @example
 *   .with(P.nonNullable, (x) => `${x} isn't null nor undefined`)
 */
export declare const nonNullable: NonNullablePattern;
/**
 * `P.instanceOf(SomeClass)` is a pattern matching instances of a given class.
 *
 * [Read the documentation for `P.instanceOf` on GitHub](https://github.com/gvergnaud/ts-pattern#pinstanceof-patterns)
 *
 *  @example
 *   .with(P.instanceOf(SomeClass), () => 'will match on SomeClass instances')
 */
export declare function instanceOf<T extends AnyConstructor>(classConstructor: T): Chainable<GuardP<unknown, InstanceType<T>>>;
/**
 * `P.shape(somePattern)` lets you call methods like `.optional()`, `.and`, `.or` and `.select()`
 * On structural patterns, like objects and arrays.
 *
 * [Read the documentation for `P.shape` on GitHub](https://github.com/gvergnaud/ts-pattern#pshape-patterns)
 *
 *  @example
 *   .with(
 *     {
 *       state: P.shape({ status: "success" }).optional().select()
 *     },
 *     (state) => 'match the success state, or undefined.'
 *   )
 */
export declare function shape<input, const pattern extends Pattern<input>>(pattern: pattern): Chainable<GuardP<input, InvertPattern<pattern, input>>>;
