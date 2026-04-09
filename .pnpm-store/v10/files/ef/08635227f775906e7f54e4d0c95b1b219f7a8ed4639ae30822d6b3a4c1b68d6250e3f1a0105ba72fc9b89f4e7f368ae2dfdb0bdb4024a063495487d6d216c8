import { normalizeHeaders } from './normalize-headers';

/**
 * Appends suffix parts to the `user-agent` header.
 * If a `user-agent` header already exists, the suffix parts are appended to it.
 * If no `user-agent` header exists, a new one is created with the suffix parts.
 * Automatically removes undefined entries from the headers.
 *
 * @param headers - The original headers.
 * @param userAgentSuffixParts - The parts to append to the `user-agent` header.
 * @returns The new headers with the `user-agent` header set or updated.
 */
export function withUserAgentSuffix(
  headers: HeadersInit | Record<string, string | undefined> | undefined,
  ...userAgentSuffixParts: string[]
): Record<string, string> {
  const normalizedHeaders = new Headers(normalizeHeaders(headers));

  const currentUserAgentHeader = normalizedHeaders.get('user-agent') || '';

  normalizedHeaders.set(
    'user-agent',
    [currentUserAgentHeader, ...userAgentSuffixParts].filter(Boolean).join(' '),
  );

  return Object.fromEntries(normalizedHeaders.entries());
}
