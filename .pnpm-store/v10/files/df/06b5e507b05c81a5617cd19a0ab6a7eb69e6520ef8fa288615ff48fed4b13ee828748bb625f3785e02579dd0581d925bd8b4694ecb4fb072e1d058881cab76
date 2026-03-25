import { Provider, UserAgent } from "@smithy/types";
export { crtAvailability } from "./crt-availability";
export interface DefaultUserAgentOptions {
  serviceId?: string;
  clientVersion: string;
}
export interface PreviouslyResolved {
  userAgentAppId: Provider<string | undefined>;
}
export declare const createDefaultUserAgentProvider: ({
  serviceId,
  clientVersion,
}: DefaultUserAgentOptions) => (
  config?: PreviouslyResolved
) => Promise<UserAgent>;
export declare const defaultUserAgent: ({
  serviceId,
  clientVersion,
}: DefaultUserAgentOptions) => (
  config?: PreviouslyResolved
) => Promise<UserAgent>;
