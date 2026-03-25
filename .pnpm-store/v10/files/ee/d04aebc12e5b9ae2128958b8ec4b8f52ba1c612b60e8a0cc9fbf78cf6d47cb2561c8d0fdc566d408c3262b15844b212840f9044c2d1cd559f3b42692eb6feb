"use strict";
/**
 * Utilities for handling OAuth resource URIs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceUrlFromServerUrl = resourceUrlFromServerUrl;
exports.checkResourceAllowed = checkResourceAllowed;
/**
 * Converts a server URL to a resource URL by removing the fragment.
 * RFC 8707 section 2 states that resource URIs "MUST NOT include a fragment component".
 * Keeps everything else unchanged (scheme, domain, port, path, query).
 */
function resourceUrlFromServerUrl(url) {
    const resourceURL = typeof url === 'string' ? new URL(url) : new URL(url.href);
    resourceURL.hash = ''; // Remove fragment
    return resourceURL;
}
/**
 * Checks if a requested resource URL matches a configured resource URL.
 * A requested resource matches if it has the same scheme, domain, port,
 * and its path starts with the configured resource's path.
 *
 * @param requestedResource The resource URL being requested
 * @param configuredResource The resource URL that has been configured
 * @returns true if the requested resource matches the configured resource, false otherwise
 */
function checkResourceAllowed({ requestedResource, configuredResource }) {
    const requested = typeof requestedResource === 'string' ? new URL(requestedResource) : new URL(requestedResource.href);
    const configured = typeof configuredResource === 'string' ? new URL(configuredResource) : new URL(configuredResource.href);
    // Compare the origin (scheme, domain, and port)
    if (requested.origin !== configured.origin) {
        return false;
    }
    // Handle cases like requested=/foo and configured=/foo/
    if (requested.pathname.length < configured.pathname.length) {
        return false;
    }
    // Check if the requested path starts with the configured path
    // Ensure both paths end with / for proper comparison
    // This ensures that if we have paths like "/api" and "/api/users",
    // we properly detect that "/api/users" is a subpath of "/api"
    // By adding a trailing slash if missing, we avoid false positives
    // where paths like "/api123" would incorrectly match "/api"
    const requestedPath = requested.pathname.endsWith('/') ? requested.pathname : requested.pathname + '/';
    const configuredPath = configured.pathname.endsWith('/') ? configured.pathname : configured.pathname + '/';
    return requestedPath.startsWith(configuredPath);
}
//# sourceMappingURL=auth-utils.js.map