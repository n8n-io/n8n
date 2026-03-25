import { Logger, Provider, UserAgent } from "@smithy/types";
/**
 * @internal
 */
export declare const DEFAULT_UA_APP_ID: undefined;
/**
 * @public
 */
export interface UserAgentInputConfig {
    /**
     * The custom user agent header that would be appended to default one
     */
    customUserAgent?: string | UserAgent;
    /**
     * The application ID used to identify the application.
     */
    userAgentAppId?: string | undefined | Provider<string | undefined>;
}
interface PreviouslyResolved {
    defaultUserAgentProvider: Provider<UserAgent>;
    runtime: string;
    logger?: Logger;
}
export interface UserAgentResolvedConfig {
    /**
     * The provider populating default tracking information to be sent with `user-agent`, `x-amz-user-agent` header.
     * @internal
     */
    defaultUserAgentProvider: Provider<UserAgent>;
    /**
     * The custom user agent header that would be appended to default one
     */
    customUserAgent?: UserAgent;
    /**
     * The runtime environment
     */
    runtime: string;
    /**
     * Resolved value for input config {config.userAgentAppId}
     */
    userAgentAppId: Provider<string | undefined>;
}
export declare function resolveUserAgentConfig<T>(input: T & PreviouslyResolved & UserAgentInputConfig): T & UserAgentResolvedConfig;
export {};
