/**
 * Get and/or set configuration options
 * @param options.circularRefs enable circularRefs (default is true)
 * @return New/current config
 */
export function config({ circularRefs }?: { circularRefs?: boolean | undefined }): { circularRefs: boolean };
/**
 * The LosslessJSON.parse() method parses a string as JSON, optionally transforming
 * the value produced by parsing.
 *
 * @param text The string to parse as JSON. See the JSON object for a description of JSON syntax.
 *
 * @param reviver
 * If a function, prescribes how the value originally produced by parsing is
 * transformed, before being returned.
 *
 * @returns Returns the Object corresponding to the given JSON text.
 *
 * @throws Throws a SyntaxError exception if the string to parse is not valid JSON.
 */

export function parse(text: string, reviver?: (key: string, value: any) => any): any;
/**
 * The LosslessJSON.stringify() method converts a JavaScript value to a JSON string,
 * optionally replacing values if a replacer function is specified, or
 * optionally including only the specified properties if a replacer array is specified.
 *
 * @param value
 * The value to convert to a JSON string.
 *
 * @param replacer
 * A function that alters the behavior of the stringification process,
 * or an array of String and Number objects that serve as a whitelist for
 * selecting the properties of the value object to be included in the JSON string.
 * If this value is null or not provided, all properties of the object are
 * included in the resulting JSON string.
 *
 * @param space
 * A String or Number object that's used to insert white space into the output
 * JSON string for readability purposes. If this is a Number, it indicates the
 * number of space characters to use as white space; this number is capped at 10
 * if it's larger than that. Values less than 1 indicate that no space should be
 * used. If this is a String, the string (or the first 10 characters of the string,
 * if it's longer than that) is used as white space. If this parameter is not
 * provided (or is null), no white space is used.
 *
 * @returns String representation of the JSON object.
 */
export function stringify(
    value: any,
    replacer?: ((key: string, value: any) => any) | Array<string | number>,
    space?: string | number,
): string;

/**
 * A lossless number. Stores its value as string
 * @param  value
 */
export class LosslessNumber {
    // value as string
    value: string;
    type: "LosslessNumber";
    isLosslessNumber: true;
    constructor(value: string | number);
    /**
     * Get the value of the LosslessNumber as number.
     * Will throw an error when this conversion would result in a truncation of the number.
     * @return Number
     */
    valueOf(): number;
    /**
     * Get the value of the LosslessNumber as string.
     * @return string
     */
    toString(): string;
}
