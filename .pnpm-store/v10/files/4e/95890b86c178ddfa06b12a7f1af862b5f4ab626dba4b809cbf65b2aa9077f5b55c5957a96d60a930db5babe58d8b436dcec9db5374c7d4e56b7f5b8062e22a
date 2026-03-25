import { Provider, UserAgent } from "@smithy/types";
import { DefaultUserAgentOptions } from "./configurations";
/**
 * @internal
 */
export interface PreviouslyResolved {
    userAgentAppId: Provider<string | undefined>;
}
/**
 * Default provider to the user agent in ReactNative.
 * @internal
 */
export declare const createDefaultUserAgentProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
/**
 * @internal
 * @deprecated use createDefaultUserAgentProvider
 */
export declare const defaultUserAgent: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
