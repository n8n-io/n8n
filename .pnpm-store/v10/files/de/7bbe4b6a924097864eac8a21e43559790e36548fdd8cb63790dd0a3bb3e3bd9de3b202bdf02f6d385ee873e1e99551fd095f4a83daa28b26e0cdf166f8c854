declare const MAX_ARGUMENT_LENGTH = 200;
/**
 * helper function that tried to get a string value for
 * arbitrary "debug" arg
 */
declare function getStringValue(v: any): string | void;
/**
 * helper function that redacts a string representation of a "debug" arg
 */
declare function genRedactedString(str: string, maxLen: number): string;
/**
 * a wrapper for the `debug` module, used to generate
 * "debug functions" that trim the values in their output
 */
export default function genDebugFunction(namespace: string): (...args: any[]) => void;
export { MAX_ARGUMENT_LENGTH, getStringValue, genRedactedString };
