import type { AzureLogger } from "@azure/logger";
/**
 * The AzureLogger used for all clients within the identity package
 */
export declare const logger: AzureLogger;
interface EnvironmentAccumulator {
    missing: string[];
    assigned: string[];
}
/**
 * Separates a list of environment variable names into a plain object with two arrays: an array of missing environment variables and another array with assigned environment variables.
 * @param supportedEnvVars - List of environment variable names
 */
export declare function processEnvVars(supportedEnvVars: string[]): EnvironmentAccumulator;
/**
 * Based on a given list of environment variable names,
 * logs the environment variables currently assigned during the usage of a credential that goes by the given name.
 * @param credentialName - Name of the credential in use
 * @param supportedEnvVars - List of environment variables supported by that credential
 */
export declare function logEnvVars(credentialName: string, supportedEnvVars: string[]): void;
/**
 * Formatting the success event on the credentials
 */
export declare function formatSuccess(scope: string | string[]): string;
/**
 * Formatting the success event on the credentials
 */
export declare function formatError(scope: string | string[] | undefined, error: Error | string): string;
/**
 * A CredentialLoggerInstance is a logger properly formatted to work in a credential's constructor, and its methods.
 */
export interface CredentialLoggerInstance {
    title: string;
    fullTitle: string;
    info(message: string): void;
    warning(message: string): void;
    verbose(message: string): void;
    error(err: string): void;
}
/**
 * Generates a CredentialLoggerInstance.
 *
 * It logs with the format:
 *
 *   `[title] => [message]`
 *
 */
export declare function credentialLoggerInstance(title: string, parent?: CredentialLoggerInstance, log?: AzureLogger): CredentialLoggerInstance;
/**
 * A CredentialLogger is a logger declared at the credential's constructor, and used at any point in the credential.
 * It has all the properties of a CredentialLoggerInstance, plus other logger instances, one per method.
 */
export interface CredentialLogger extends CredentialLoggerInstance {
    parent: AzureLogger;
    getToken: CredentialLoggerInstance;
}
/**
 * Generates a CredentialLogger, which is a logger declared at the credential's constructor, and used at any point in the credential.
 * It has all the properties of a CredentialLoggerInstance, plus other logger instances, one per method.
 *
 * It logs with the format:
 *
 *   `[title] => [message]`
 *   `[title] => getToken() => [message]`
 *
 */
export declare function credentialLogger(title: string, log?: AzureLogger): CredentialLogger;
export {};
//# sourceMappingURL=logging.d.ts.map