import { Provider, UserAgent } from "@smithy/types";
import { DefaultUserAgentOptions } from "./configurations";
export interface PreviouslyResolved {
    userAgentAppId: Provider<string | undefined>;
}
/**
 * @internal
 *
 * Default provider to the user agent in browsers. It's a best effort to infer
 * the device information. It uses bowser library to detect the browser and version
 */
export declare const createDefaultUserAgentProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
/**
 * @internal
 * @deprecated use createDefaultUserAgentProvider
 */
export declare const defaultUserAgent: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
