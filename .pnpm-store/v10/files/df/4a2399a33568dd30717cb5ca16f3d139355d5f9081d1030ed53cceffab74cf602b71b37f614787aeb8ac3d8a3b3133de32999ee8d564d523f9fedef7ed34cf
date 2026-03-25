import { Provider, UserAgent } from "@smithy/types";
import type { DefaultUserAgentOptions } from "./configurations";
export { createUserAgentStringParsingProvider } from "./createUserAgentStringParsingProvider";
/**
 * @internal
 */
export interface PreviouslyResolved {
    userAgentAppId: Provider<string | undefined>;
}
/**
 * Default provider of the AWS SDK user agent string in react-native.
 * @internal
 */
export declare const createDefaultUserAgentProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
/**
 * Rudimentary UA string parsing as a fallback.
 * @internal
 */
export declare const fallback: {
    os(ua: string): string | undefined;
    browser(ua: string): string | undefined;
};
/**
 * @internal
 * @deprecated use createDefaultUserAgentProvider
 */
export declare const defaultUserAgent: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
