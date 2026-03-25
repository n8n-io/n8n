import type { Logger, Provider } from "@smithy/types";
/**
 * @internal
 */
export interface EnvOptions {
    /**
     * The SigV4 service signing name.
     */
    signingName?: string;
    /**
     * For credential resolution trace logging.
     */
    logger?: Logger;
}
export type GetterFromEnv<T> = (env: Record<string, string | undefined>, options?: EnvOptions) => T | undefined;
/**
 * Get config value given the environment variable name or getter from
 * environment variable.
 */
export declare const fromEnv: <T = string>(envVarSelector: GetterFromEnv<T>, options?: EnvOptions) => Provider<T>;
