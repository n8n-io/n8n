import { Provider, UserAgent } from "@smithy/types";
export { crtAvailability } from "./crt-availability";
export interface DefaultUserAgentOptions {
    serviceId?: string;
    clientVersion: string;
}
export interface PreviouslyResolved {
    userAgentAppId: Provider<string | undefined>;
}
/**
 * @internal
 *
 * Collect metrics from runtime to put into user agent.
 */
export declare const createDefaultUserAgentProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => (config?: PreviouslyResolved) => Promise<UserAgent>;
/**
 *
 * @internal
 *
 * @deprecated use createDefaultUserAgentProvider
 *
 */
export declare const defaultUserAgent: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => (config?: PreviouslyResolved) => Promise<UserAgent>;
