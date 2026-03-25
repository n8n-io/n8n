import { Provider, UserAgent } from "@smithy/types";
import { DefaultUserAgentOptions } from "./configurations";
export { createUserAgentStringParsingProvider } from "./createUserAgentStringParsingProvider";
export interface PreviouslyResolved {
  userAgentAppId: Provider<string | undefined>;
}
export declare const createDefaultUserAgentProvider: ({
  serviceId,
  clientVersion,
}: DefaultUserAgentOptions) => (
  config?: PreviouslyResolved
) => Promise<UserAgent>;
export declare const fallback: {
  os(ua: string): string | undefined;
  browser(ua: string): string | undefined;
};
export declare const defaultUserAgent: ({
  serviceId,
  clientVersion,
}: DefaultUserAgentOptions) => (
  config?: PreviouslyResolved
) => Promise<UserAgent>;
