import type { FetchFunction, Resolvable } from '@ai-sdk/provider-utils';

export type GatewayConfig = {
  baseURL: string;
  headers: () => Resolvable<Record<string, string | undefined>>;
  fetch?: FetchFunction;
};
