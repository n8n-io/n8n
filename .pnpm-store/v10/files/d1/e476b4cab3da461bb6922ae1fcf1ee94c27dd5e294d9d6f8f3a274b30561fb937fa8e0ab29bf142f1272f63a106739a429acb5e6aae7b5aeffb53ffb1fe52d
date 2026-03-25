export = codegen;

/**
 * Appends code to the function's body.
 * @param [formatStringOrScope] Format string or, to finish the function, an object of additional scope variables, if any
 * @param [formatParams] Format parameters
 * @returns Itself or the generated function if finished
 * @throws {Error} If format parameter counts do not match
 */
type Codegen = (formatStringOrScope?: (string|{ [k: string]: any }), ...formatParams: any[]) => (Codegen|Function);

/**
 * Begins generating a function.
 * @param functionParams Function parameter names
 * @param [functionName] Function name if not anonymous
 * @returns Appender that appends code to the function's body
 */
declare function codegen(functionParams: string[], functionName?: string): Codegen;

/**
 * Begins generating a function.
 * @param [functionName] Function name if not anonymous
 * @returns Appender that appends code to the function's body
 */
declare function codegen(functionName?: string): Codegen;

declare namespace codegen {

    /** When set to `true`, codegen will log generated code to console. Useful for debugging. */
    let verbose: boolean;
}
