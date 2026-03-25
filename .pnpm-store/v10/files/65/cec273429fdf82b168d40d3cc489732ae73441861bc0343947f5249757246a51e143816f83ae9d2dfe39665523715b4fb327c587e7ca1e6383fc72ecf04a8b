// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Defines the default token refresh buffer duration.
 */
export const DefaultTokenRefreshBufferMs = 2 * 60 * 1000; // 2 Minutes
/**
 * Provides an AccessTokenCache implementation which clears
 * the cached AccessToken's after the expiresOnTimestamp has
 * passed.
 * @internal
 */
export class ExpiringAccessTokenCache {
    /**
     * Constructs an instance of ExpiringAccessTokenCache with
     * an optional expiration buffer time.
     */
    constructor(tokenRefreshBufferMs = DefaultTokenRefreshBufferMs) {
        this.tokenRefreshBufferMs = tokenRefreshBufferMs;
    }
    setCachedToken(accessToken) {
        this.cachedToken = accessToken;
    }
    getCachedToken() {
        if (this.cachedToken &&
            Date.now() + this.tokenRefreshBufferMs >= this.cachedToken.expiresOnTimestamp) {
            this.cachedToken = undefined;
        }
        return this.cachedToken;
    }
}
//# sourceMappingURL=accessTokenCache.js.map