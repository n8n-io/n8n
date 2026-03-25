import { BaseExternalAccountClient, BaseExternalAccountClientOptions } from './baseexternalclient';
import { AuthClientOptions } from './authclient';
/**
 * Defines the credential source portion of the configuration for PluggableAuthClient.
 *
 * <p>Command is the only required field. If timeout_millis is not specified, the library will
 * default to a 30-second timeout.
 *
 * <pre>
 * Sample credential source for Pluggable Auth Client:
 * {
 *   ...
 *   "credential_source": {
 *     "executable": {
 *       "command": "/path/to/get/credentials.sh --arg1=value1 --arg2=value2",
 *       "timeout_millis": 5000,
 *       "output_file": "/path/to/generated/cached/credentials"
 *     }
 *   }
 * }
 * </pre>
 */
export interface PluggableAuthClientOptions extends BaseExternalAccountClientOptions {
    credential_source: {
        executable: {
            /**
             * The command used to retrieve the 3rd party token.
             */
            command: string;
            /**
             * The timeout for executable to run in milliseconds. If none is provided it
             * will be set to the default timeout of 30 seconds.
             */
            timeout_millis?: number;
            /**
             * An optional output file location that will be checked for a cached response
             * from a previous run of the executable.
             */
            output_file?: string;
        };
    };
}
/**
 * Error thrown from the executable run by PluggableAuthClient.
 */
export declare class ExecutableError extends Error {
    /**
     * The exit code returned by the executable.
     */
    readonly code: string;
    constructor(message: string, code: string);
}
/**
 * PluggableAuthClient enables the exchange of workload identity pool external credentials for
 * Google access tokens by retrieving 3rd party tokens through a user supplied executable. These
 * scripts/executables are completely independent of the Google Cloud Auth libraries. These
 * credentials plug into ADC and will call the specified executable to retrieve the 3rd party token
 * to be exchanged for a Google access token.
 *
 * <p>To use these credentials, the GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES environment variable
 * must be set to '1'. This is for security reasons.
 *
 * <p>Both OIDC and SAML are supported. The executable must adhere to a specific response format
 * defined below.
 *
 * <p>The executable must print out the 3rd party token to STDOUT in JSON format. When an
 * output_file is specified in the credential configuration, the executable must also handle writing the
 * JSON response to this file.
 *
 * <pre>
 * OIDC response sample:
 * {
 *   "version": 1,
 *   "success": true,
 *   "token_type": "urn:ietf:params:oauth:token-type:id_token",
 *   "id_token": "HEADER.PAYLOAD.SIGNATURE",
 *   "expiration_time": 1620433341
 * }
 *
 * SAML2 response sample:
 * {
 *   "version": 1,
 *   "success": true,
 *   "token_type": "urn:ietf:params:oauth:token-type:saml2",
 *   "saml_response": "...",
 *   "expiration_time": 1620433341
 * }
 *
 * Error response sample:
 * {
 *   "version": 1,
 *   "success": false,
 *   "code": "401",
 *   "message": "Error message."
 * }
 * </pre>
 *
 * <p>The "expiration_time" field in the JSON response is only required for successful
 * responses when an output file was specified in the credential configuration
 *
 * <p>The auth libraries will populate certain environment variables that will be accessible by the
 * executable, such as: GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE, GOOGLE_EXTERNAL_ACCOUNT_TOKEN_TYPE,
 * GOOGLE_EXTERNAL_ACCOUNT_INTERACTIVE, GOOGLE_EXTERNAL_ACCOUNT_IMPERSONATED_EMAIL, and
 * GOOGLE_EXTERNAL_ACCOUNT_OUTPUT_FILE.
 *
 * <p>Please see this repositories README for a complete executable request/response specification.
 */
export declare class PluggableAuthClient extends BaseExternalAccountClient {
    /**
     * The command used to retrieve the third party token.
     */
    private readonly command;
    /**
     * The timeout in milliseconds for running executable,
     * set to default if none provided.
     */
    private readonly timeoutMillis;
    /**
     * The path to file to check for cached executable response.
     */
    private readonly outputFile?;
    /**
     * Executable and output file handler.
     */
    private readonly handler;
    /**
     * Instantiates a PluggableAuthClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid pluggable auth credential.
     * @param options The external account options object typically loaded from
     *   the external account JSON credential file.
     * @param additionalOptions **DEPRECATED, all options are available in the
     *   `options` parameter.** Optional additional behavior customization options.
     *   These currently customize expiration threshold time and whether to retry
     *   on 401/403 API request errors.
     */
    constructor(options: PluggableAuthClientOptions, additionalOptions?: AuthClientOptions);
    /**
     * Triggered when an external subject token is needed to be exchanged for a
     * GCP access token via GCP STS endpoint.
     * This uses the `options.credential_source` object to figure out how
     * to retrieve the token using the current environment. In this case,
     * this calls a user provided executable which returns the subject token.
     * The logic is summarized as:
     * 1. Validated that the executable is allowed to run. The
     *    GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES environment must be set to
     *    1 for security reasons.
     * 2. If an output file is specified by the user, check the file location
     *    for a response. If the file exists and contains a valid response,
     *    return the subject token from the file.
     * 3. Call the provided executable and return response.
     * @return A promise that resolves with the external subject token.
     */
    retrieveSubjectToken(): Promise<string>;
}
