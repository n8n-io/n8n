/**
 * Utilities for handling OAuth resource URIs.
 */
/**
 * Converts a server URL to a resource URL by removing the fragment.
 * RFC 8707 section 2 states that resource URIs "MUST NOT include a fragment component".
 * Keeps everything else unchanged (scheme, domain, port, path, query).
 */
export declare function resourceUrlFromServerUrl(url: URL | string): URL;
/**
 * Checks if a requested resource URL matches a configured resource URL.
 * A requested resource matches if it has the same scheme, domain, port,
 * and its path starts with the configured resource's path.
 *
 * @param requestedResource The resource URL being requested
 * @param configuredResource The resource URL that has been configured
 * @returns true if the requested resource matches the configured resource, false otherwise
 */
export declare function checkResourceAllowed({ requestedResource, configuredResource }: {
    requestedResource: URL | string;
    configuredResource: URL | string;
}): boolean;
//# sourceMappingURL=auth-utils.d.ts.map