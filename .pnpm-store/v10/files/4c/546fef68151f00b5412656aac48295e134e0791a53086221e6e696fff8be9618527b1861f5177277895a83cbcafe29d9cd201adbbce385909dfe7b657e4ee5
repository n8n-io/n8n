import type { NumberStringifier, Replacer } from './types';
/**
 * The LosslessJSON.stringify() method converts a JavaScript value to a JSON string,
 * optionally replacing values if a replacer function is specified, or
 * optionally including only the specified properties if a replacer array is specified.
 *
 * @param value
 * The value to convert to a JSON string.
 *
 * @param [replacer]
 * A function that alters the behavior of the stringification process,
 * or an array of String and Number objects that serve as a whitelist for
 * selecting the properties of the value object to be included in the JSON string.
 * If this value is null or not provided, all properties of the object are
 * included in the resulting JSON string.
 *
 * @param [space]
 * A String or Number object that's used to insert white space into the output
 * JSON string for readability purposes. If this is a Number, it indicates the
 * number of space characters to use as white space; this number is capped at 10
 * if it's larger than that. Values less than 1 indicate that no space should be
 * used. If this is a String, the string (or the first 10 characters of the string,
 * if it's longer than that) is used as white space. If this parameter is not
 * provided (or is null), no white space is used.
 *
 * @param [numberStringifiers]
 * An optional list with additional number stringifiers, for example to serialize
 * a BigNumber. The output of the function must be valid stringified JSON.
 * When `undefined` is returned, the property will be deleted from the object.
 * The difference with using a `replacer` is that the output of a `replacer`
 * must be JSON and will be stringified afterwards, whereas the output of the
 * `numberStringifiers` is already stringified JSON.
 *
 * @returns Returns the string representation of the JSON object.
 */
export declare function stringify(value: unknown, replacer?: Replacer | null, space?: number | string, numberStringifiers?: NumberStringifier[]): string | undefined;
//# sourceMappingURL=stringify.d.ts.map