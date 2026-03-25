import { Attribute, AttributeKey } from '@ts-graphviz/common';
import { Layout, Options } from './types.js';
/**
 * escapeValue is a function that escapes a given Attribute value of a given AttributeKey.
 * It checks the type of the value and adds quotes if the value is of type string and contains whitespace.
 *
 * @param value The value of an Attribute of type T that extends AttributeKey
 * @returns The escaped Attribute value
 */
export declare function escapeValue<T extends AttributeKey>(value: Attribute<T>): string;
/**
 * createCommandArgs is a function that creates command arguments from a given Options object.
 * It reads the properties of the Options object and creates corresponding command line arguments accordingly.
 *
 * @param options The Options object used to create command arguments
 * @returns A generator that yields strings for command arguments
 */
export declare function createCommandArgs<T extends Layout>(options: Options<T>): Generator<string>;
