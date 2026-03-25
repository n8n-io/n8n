//#region src/utils/ssrf.d.ts
/**
 * Check if an IP address is private (RFC 1918, loopback, link-local, etc.)
 */
declare function isPrivateIp(ip: string): boolean;
/**
 * Check if a hostname or IP is a known cloud metadata endpoint.
 */
declare function isCloudMetadata(hostname: string, ip?: string): boolean;
/**
 * Check if a hostname or IP is localhost.
 */
declare function isLocalhost(hostname: string, ip?: string): boolean;
/**
 * Validate that a URL is safe to connect to.
 * Performs static validation checks against hostnames and direct IP addresses.
 * Does not perform DNS resolution.
 *
 * @param url URL to validate
 * @param options.allowPrivate Allow private IPs (default: false)
 * @param options.allowHttp Allow http:// scheme (default: false)
 * @returns The validated URL
 * @throws Error if URL is not safe
 */
declare function validateSafeUrl(url: string, options?: {
  allowPrivate?: boolean;
  allowHttp?: boolean;
}): string;
/**
 * Check if a URL is safe to connect to (non-throwing version).
 *
 * @param url URL to check
 * @param options.allowPrivate Allow private IPs (default: false)
 * @param options.allowHttp Allow http:// scheme (default: false)
 * @returns true if URL is safe, false otherwise
 */
declare function isSafeUrl(url: string, options?: {
  allowPrivate?: boolean;
  allowHttp?: boolean;
}): boolean;
/**
 * Check if two URLs have the same origin (scheme, host, port).
 * Uses semantic URL parsing to prevent SSRF bypasses via URL variations.
 *
 * @param url1 First URL
 * @param url2 Second URL
 * @returns true if both URLs have the same origin, false otherwise
 */
declare function isSameOrigin(url1: string, url2: string): boolean;
//#endregion
export { isCloudMetadata, isLocalhost, isPrivateIp, isSafeUrl, isSameOrigin, validateSafeUrl };
//# sourceMappingURL=ssrf.d.ts.map