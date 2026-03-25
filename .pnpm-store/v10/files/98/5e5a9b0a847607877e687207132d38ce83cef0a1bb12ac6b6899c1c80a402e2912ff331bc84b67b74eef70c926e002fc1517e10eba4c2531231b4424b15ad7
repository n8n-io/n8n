import { ParsedIniData } from "@smithy/types";
/**
 * Subset of {@link SharedConfigInit}.
 * @internal
 */
export interface SsoSessionInit {
    /**
     * The path at which to locate the ini config file. Defaults to the value of
     * the `AWS_CONFIG_FILE` environment variable (if defined) or
     * `~/.aws/config` otherwise.
     */
    configFilepath?: string;
}
/**
 * @internal
 */
export declare const loadSsoSessionData: (init?: SsoSessionInit) => Promise<ParsedIniData>;
