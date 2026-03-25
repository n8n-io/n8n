import { getProxyAgent } from '@redocly/openapi-core';

export const DEFAULT_FETCH_TIMEOUT = 3000;

export type FetchWithTimeoutOptions = RequestInit & {
  timeout?: number;
};

export default async (url: string, { timeout, ...options }: FetchWithTimeoutOptions = {}) => {
  if (!timeout) {
    return fetch(url, {
      ...options,
      dispatcher: getProxyAgent(),
    } as RequestInit);
  }

  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const res = await fetch(url, {
    signal: controller.signal,
    ...options,
    dispatcher: getProxyAgent(),
  } as RequestInit);

  clearTimeout(timeoutId);
  return res;
};
