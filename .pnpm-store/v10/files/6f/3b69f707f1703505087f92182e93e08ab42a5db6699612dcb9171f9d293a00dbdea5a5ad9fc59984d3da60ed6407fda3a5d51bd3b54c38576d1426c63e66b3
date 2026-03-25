declare global {
    const Deno: {
        version: {
            deno: string;
        };
    } | undefined;
}
export declare const isBrowser: () => boolean;
export declare const isWebWorker: () => boolean;
export declare const isJsDom: () => boolean;
export declare const isDeno: () => boolean;
export declare const isNode: () => boolean;
export declare const getEnv: () => string;
export type RuntimeEnvironment = {
    library: string;
    libraryVersion?: string;
    sdk: string;
    sdk_version: string;
    runtime: string;
    runtimeVersion?: string;
};
export declare function getRuntimeEnvironment(): RuntimeEnvironment;
/**
 * Retrieves the LangSmith-specific metadata from the current runtime environment.
 *
 * @returns {Record<string, string>}
 *  - A record of LangSmith-specific metadata environment variables.
 */
export declare function getLangSmithEnvVarsMetadata(): Record<string, string>;
/**
 * Retrieves only the LangChain/LangSmith-prefixed environment variables from the current runtime environment.
 * This is more efficient than copying all environment variables.
 *
 * @returns {Record<string, string>}
 *  - A record of LangChain/LangSmith environment variables.
 */
export declare function getLangSmithEnvironmentVariables(): Record<string, string>;
export declare function getEnvironmentVariable(name: string): string | undefined;
export declare function getLangSmithEnvironmentVariable(name: string): string | undefined;
export declare function setEnvironmentVariable(name: string, value: string): void;
interface ICommitSHAs {
    [key: string]: string;
}
/**
 * Get the Git commit SHA from common environment variables
 * used by different CI/CD platforms.
 * @returns {string | undefined} The Git commit SHA or undefined if not found.
 */
export declare function getShas(): ICommitSHAs;
export declare function getOtelEnabled(): boolean;
export {};
