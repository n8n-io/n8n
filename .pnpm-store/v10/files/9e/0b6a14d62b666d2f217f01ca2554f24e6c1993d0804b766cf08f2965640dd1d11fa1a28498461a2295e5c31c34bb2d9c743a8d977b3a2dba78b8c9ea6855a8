import type * as errors from "./errors.js";
export interface $ZodConfig {
    /** Custom error map. Overrides `config().localeError`. */
    customError?: errors.$ZodErrorMap | undefined;
    /** Localized error map. Lowest priority. */
    localeError?: errors.$ZodErrorMap | undefined;
}
export declare const globalConfig: $ZodConfig;
export declare function config(config?: Partial<$ZodConfig>): $ZodConfig;
