import { Class } from './Class';
/**
 * Get the parameters of a class constructor
 * @param C **typeof** class
 * @returns [[List]]
 * @example
 * ```ts
 * import {C} from 'ts-toolbelt'
 *
 * type User = C.Class<[string, string], {firstname: string, lastname: string}>
 *
 * type test0 = C.Parameters<User> // [string, string]
 * ```
 */
export declare type Parameters<C extends Class> = C extends Class<infer P, any> ? P : never;
