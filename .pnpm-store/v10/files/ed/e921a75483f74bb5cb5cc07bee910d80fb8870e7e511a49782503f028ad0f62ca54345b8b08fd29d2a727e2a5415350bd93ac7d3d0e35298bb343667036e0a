/**
 * Interface for getInput options
 */
export interface InputOptions {
    /** Optional. Whether the input is required. If required and not present, will throw. Defaults to false */
    required?: boolean;
    /** Optional. Whether leading/trailing whitespace will be trimmed for the input. Defaults to true */
    trimWhitespace?: boolean;
}
/**
 * The code to exit an action
 */
export declare enum ExitCode {
    /**
     * A code indicating that the action was successful
     */
    Success = 0,
    /**
     * A code indicating that the action was a failure
     */
    Failure = 1
}
/**
 * Optional properties that can be sent with annotation commands (notice, error, and warning)
 * See: https://docs.github.com/en/rest/reference/checks#create-a-check-run for more information about annotations.
 */
export interface AnnotationProperties {
    /**
     * A title for the annotation.
     */
    title?: string;
    /**
     * The path of the file for which the annotation should be created.
     */
    file?: string;
    /**
     * The start line for the annotation.
     */
    startLine?: number;
    /**
     * The end line for the annotation. Defaults to `startLine` when `startLine` is provided.
     */
    endLine?: number;
    /**
     * The start column for the annotation. Cannot be sent when `startLine` and `endLine` are different values.
     */
    startColumn?: number;
    /**
     * The end column for the annotation. Cannot be sent when `startLine` and `endLine` are different values.
     * Defaults to `startColumn` when `startColumn` is provided.
     */
    endColumn?: number;
}
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable. Non-string values will be converted to a string via JSON.stringify
 */
export declare function exportVariable(name: string, val: any): void;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
export declare function setSecret(secret: string): void;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
export declare function addPath(inputPath: string): void;
/**
 * Gets the value of an input.
 * Unless trimWhitespace is set to false in InputOptions, the value is also trimmed.
 * Returns an empty string if the value is not defined.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
export declare function getInput(name: string, options?: InputOptions): string;
/**
 * Gets the values of an multiline input.  Each value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string[]
 *
 */
export declare function getMultilineInput(name: string, options?: InputOptions): string[];
/**
 * Gets the input value of the boolean type in the YAML 1.2 "core schema" specification.
 * Support boolean input list: `true | True | TRUE | false | False | FALSE` .
 * The return value is also in boolean type.
 * ref: https://yaml.org/spec/1.2/spec.html#id2804923
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   boolean
 */
export declare function getBooleanInput(name: string, options?: InputOptions): boolean;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
export declare function setOutput(name: string, value: any): void;
/**
 * Enables or disables the echoing of commands into stdout for the rest of the step.
 * Echoing is disabled by default if ACTIONS_STEP_DEBUG is not set.
 *
 */
export declare function setCommandEcho(enabled: boolean): void;
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
export declare function setFailed(message: string | Error): void;
/**
 * Gets whether Actions Step Debug is on or not
 */
export declare function isDebug(): boolean;
/**
 * Writes debug message to user log
 * @param message debug message
 */
export declare function debug(message: string): void;
/**
 * Adds an error issue
 * @param message error issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */
export declare function error(message: string | Error, properties?: AnnotationProperties): void;
/**
 * Adds a warning issue
 * @param message warning issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */
export declare function warning(message: string | Error, properties?: AnnotationProperties): void;
/**
 * Adds a notice issue
 * @param message notice issue message. Errors will be converted to string via toString()
 * @param properties optional properties to add to the annotation.
 */
export declare function notice(message: string | Error, properties?: AnnotationProperties): void;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
export declare function info(message: string): void;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
export declare function startGroup(name: string): void;
/**
 * End an output group.
 */
export declare function endGroup(): void;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
export declare function group<T>(name: string, fn: () => Promise<T>): Promise<T>;
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store. Non-string values will be converted to a string via JSON.stringify
 */
export declare function saveState(name: string, value: any): void;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
export declare function getState(name: string): string;
export declare function getIDToken(aud?: string): Promise<string>;
/**
 * Summary exports
 */
export { summary } from './summary';
/**
 * @deprecated use core.summary
 */
export { markdownSummary } from './summary';
/**
 * Path exports
 */
export { toPosixPath, toWin32Path, toPlatformPath } from './path-utils';
/**
 * Platform utilities exports
 */
export * as platform from './platform';
