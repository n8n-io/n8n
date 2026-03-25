import { Logger, Provider, UserAgent } from "@smithy/types";
export declare const DEFAULT_UA_APP_ID: undefined;
export interface UserAgentInputConfig {
  customUserAgent?: string | UserAgent;
  userAgentAppId?: string | undefined | Provider<string | undefined>;
}
interface PreviouslyResolved {
  defaultUserAgentProvider: Provider<UserAgent>;
  runtime: string;
  logger?: Logger;
}
export interface UserAgentResolvedConfig {
  defaultUserAgentProvider: Provider<UserAgent>;
  customUserAgent?: UserAgent;
  runtime: string;
  userAgentAppId: Provider<string | undefined>;
}
export declare function resolveUserAgentConfig<T>(
  input: T & PreviouslyResolved & UserAgentInputConfig
): T & UserAgentResolvedConfig;
export {};
