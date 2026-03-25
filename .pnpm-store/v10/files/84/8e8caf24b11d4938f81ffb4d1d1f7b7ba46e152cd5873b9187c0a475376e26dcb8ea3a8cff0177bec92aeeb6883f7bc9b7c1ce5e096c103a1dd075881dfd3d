import type { Faker } from '../../faker';
/**
 * Resolves the given expression and returns its result. This method should only be used when using serialized expressions.
 *
 * This method is useful if you have to build a random string from a static, non-executable source
 * (e.g. string coming from a developer, stored in a database or a file).
 *
 * It tries to resolve the expression on the given/default entrypoints:
 *
 * ```js
 * const firstName = fakeEval('person.firstName', faker);
 * const firstName2 = fakeEval('person.first_name', faker);
 * ```
 *
 * Is equivalent to:
 *
 * ```js
 * const firstName = faker.person.firstName();
 * const firstName2 = faker.helpers.arrayElement(faker.rawDefinitions.person.first_name);
 * ```
 *
 * You can provide parameters as well. At first, they will be parsed as json,
 * and if that isn't possible, it will fall back to string:
 *
 * ```js
 * const message = fakeEval('phone.number(+!# !## #### #####!)', faker);
 * ```
 *
 * It is also possible to use multiple parameters (comma separated).
 *
 * ```js
 * const pin = fakeEval('string.numeric(4, {"allowLeadingZeros": true})', faker);
 * ```
 *
 * This method can resolve expressions with varying depths (dot separated parts).
 *
 * ```ts
 * const airlineModule = fakeEval('airline', faker); // AirlineModule
 * const airlineObject = fakeEval('airline.airline', faker); // { name: 'Etihad Airways', iataCode: 'EY' }
 * const airlineCode = fakeEval('airline.airline.iataCode', faker); // 'EY'
 * const airlineName = fakeEval('airline.airline().name', faker); // 'Etihad Airways'
 * const airlineMethodName = fakeEval('airline.airline.name', faker); // 'bound airline'
 * ```
 *
 * It is NOT possible to access any values not passed as entrypoints.
 *
 * This method will never return arrays, as it will pick a random element from them instead.
 *
 * @param expression The expression to evaluate on the entrypoints.
 * @param faker The faker instance to resolve array elements.
 * @param entrypoints The entrypoints to use when evaluating the expression.
 *
 * @see faker.helpers.fake() If you wish to have a string with multiple expressions.
 *
 * @example
 * fakeEval('person.lastName', faker) // 'Barrows'
 * fakeEval('helpers.arrayElement(["heads", "tails"])', faker) // 'tails'
 * fakeEval('number.int(9999)', faker) // 4834
 *
 * @since 8.4.0
 */
export declare function fakeEval(expression: string, faker: Faker, entrypoints?: ReadonlyArray<unknown>): unknown;
