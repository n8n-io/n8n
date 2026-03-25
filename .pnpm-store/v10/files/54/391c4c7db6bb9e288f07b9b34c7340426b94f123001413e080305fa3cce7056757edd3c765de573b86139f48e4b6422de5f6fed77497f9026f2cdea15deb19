import { Provider, UserAgent } from "@smithy/types";
/**
 * @internal
 */
export { crtAvailability } from "./crt-availability";
/**
 * @internal
 */
export interface DefaultUserAgentOptions {
    serviceId?: string;
    clientVersion: string;
}
/**
 * @internal
 */
export interface PreviouslyResolved {
    userAgentAppId: Provider<string | undefined>;
}
/**
 * Collect metrics from runtime to put into user agent.
 * @internal
 */
export declare const createDefaultUserAgentProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => (config?: PreviouslyResolved) => Promise<UserAgent>;
/**
 * @internal
 * @deprecated use createDefaultUserAgentProvider
 */
export declare const defaultUserAgent: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => (config?: PreviouslyResolved) => Promise<UserAgent>;
