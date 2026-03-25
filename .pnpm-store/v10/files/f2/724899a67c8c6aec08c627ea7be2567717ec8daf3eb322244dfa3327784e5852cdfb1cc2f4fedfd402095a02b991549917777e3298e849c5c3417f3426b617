import type { FetchFromCDNOptions } from './types';
/**
 * This function will fetch `emojibase-data` JSON files from our CDN, parse them,
 * and return the response. It requires a file path relative to the `emojibase-data` package
 * as the 1st argument and an optional object of options as the 2rd argument.
 *
 * ```ts
 * import { fetchFromCDN } from 'emojibase';
 *
 * await fetchFromCDN('ja/compact.json', { version: '2.1.3' });
 * await fetchFromCDN('ja/compact.json', { cdnUrl: 'https://example.com/cdn/emojidata/latest' });
 * await fetchFromCDN('ja/compact.json', {
 *     cdnUrl: (path: string, version: string) => {
 *         return `https://example.com/cdn/emojidata/${version}/${path}`;
 *     }
 * });
 * ```
 */
export declare function fetchFromCDN<T>(path: string, options?: FetchFromCDNOptions): Promise<T>;
//# sourceMappingURL=fetchFromCDN.d.ts.map