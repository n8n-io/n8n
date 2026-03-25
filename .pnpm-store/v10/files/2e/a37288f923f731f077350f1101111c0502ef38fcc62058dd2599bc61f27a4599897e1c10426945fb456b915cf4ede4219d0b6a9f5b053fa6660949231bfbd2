import type { UserAgent } from "@smithy/types";
import type { DefaultUserAgentOptions } from "./configurations";
import type { PreviouslyResolved } from "./index";
/**
 * This is an alternative to the default user agent provider that uses the bowser
 * library to parse the user agent string.
 *
 * Use this with your client's `defaultUserAgentProvider` constructor object field
 * to use the legacy behavior.
 *
 * @deprecated use the default provider unless you need the older UA-parsing functionality.
 * @public
 */
export declare const createUserAgentStringParsingProvider: ({ serviceId, clientVersion }: DefaultUserAgentOptions) => ((config?: PreviouslyResolved) => Promise<UserAgent>);
