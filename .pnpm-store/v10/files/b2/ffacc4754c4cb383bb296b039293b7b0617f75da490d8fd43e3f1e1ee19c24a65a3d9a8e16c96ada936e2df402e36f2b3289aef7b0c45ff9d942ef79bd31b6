import { ExecutableResponse } from './executable-response';
/**
 * Defines the options used for the PluggableAuthHandler class.
 */
export interface PluggableAuthHandlerOptions {
    /**
     * The command used to retrieve the third party token.
     */
    command: string;
    /**
     * The timeout in milliseconds for running executable,
     * set to default if none provided.
     */
    timeoutMillis: number;
    /**
     * The path to file to check for cached executable response.
     */
    outputFile?: string;
}
/**
 * A handler used to retrieve 3rd party token responses from user defined
 * executables and cached file output for the PluggableAuthClient class.
 */
export declare class PluggableAuthHandler {
    private readonly commandComponents;
    private readonly timeoutMillis;
    private readonly outputFile?;
    /**
     * Instantiates a PluggableAuthHandler instance using the provided
     * PluggableAuthHandlerOptions object.
     */
    constructor(options: PluggableAuthHandlerOptions);
    /**
     * Calls user provided executable to get a 3rd party subject token and
     * returns the response.
     * @param envMap a Map of additional Environment Variables required for
     *   the executable.
     * @return A promise that resolves with the executable response.
     */
    retrieveResponseFromExecutable(envMap: Map<string, string>): Promise<ExecutableResponse>;
    /**
     * Checks user provided output file for response from previous run of
     * executable and return the response if it exists, is formatted correctly, and is not expired.
     */
    retrieveCachedResponse(): Promise<ExecutableResponse | undefined>;
    /**
     * Parses given command string into component array, splitting on spaces unless
     * spaces are between quotation marks.
     */
    private static parseCommand;
}
