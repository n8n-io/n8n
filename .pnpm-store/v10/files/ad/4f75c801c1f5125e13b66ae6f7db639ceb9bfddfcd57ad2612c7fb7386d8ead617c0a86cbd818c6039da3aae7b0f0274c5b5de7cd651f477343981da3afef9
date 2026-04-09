"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenHandler = void 0;
const getToken_1 = require("./getToken");
const getCredentials_1 = require("./getCredentials");
/**
 * Manages the fetching and caching of access tokens.
 */
class TokenHandler {
    /** The cached access token. */
    token;
    /** The expiration time of the cached access token. */
    tokenExpiresAt;
    /** A promise for an in-flight token request. */
    inFlightRequest;
    tokenOptions;
    /**
     * Creates an instance of TokenHandler.
     * @param tokenOptions The options for fetching tokens.
     * @param transporter The transporter to use for making requests.
     */
    constructor(tokenOptions) {
        this.tokenOptions = tokenOptions;
    }
    /**
     * Processes the credentials, loading them from a key file if necessary.
     * This method is called before any token request.
     */
    async processCredentials() {
        if (!this.tokenOptions.key && !this.tokenOptions.keyFile) {
            throw new Error('No key or keyFile set.');
        }
        if (!this.tokenOptions.key && this.tokenOptions.keyFile) {
            const credentials = await (0, getCredentials_1.getCredentials)(this.tokenOptions.keyFile);
            this.tokenOptions.key = credentials.privateKey;
            this.tokenOptions.email = credentials.clientEmail;
        }
    }
    /**
     * Checks if the cached token is expired or close to expiring.
     * @returns True if the token is expiring, false otherwise.
     */
    isTokenExpiring() {
        if (!this.token || !this.tokenExpiresAt) {
            return true;
        }
        const now = new Date().getTime();
        const eagerRefreshThresholdMillis = this.tokenOptions.eagerRefreshThresholdMillis ?? 0;
        return this.tokenExpiresAt <= now + eagerRefreshThresholdMillis;
    }
    /**
     * Returns whether the token has completely expired.
     *
     * @returns true if the token has expired, false otherwise.
     */
    hasExpired() {
        const now = new Date().getTime();
        if (this.token && this.tokenExpiresAt) {
            const now = new Date().getTime();
            return now >= this.tokenExpiresAt;
        }
        return true;
    }
    /**
     * Fetches an access token, using a cached one if available and not expired.
     * @param forceRefresh If true, forces a new token to be fetched.
     * @returns A promise that resolves with the token data.
     */
    async getToken(forceRefresh) {
        // Ensure credentials are processed before proceeding.
        await this.processCredentials();
        // If there's an in-flight request, return it.
        if (this.inFlightRequest && !forceRefresh) {
            return this.inFlightRequest;
        }
        // If we have a valid, non-expiring token, return it.
        if (this.token && !this.isTokenExpiring() && !forceRefresh) {
            return this.token;
        }
        // Otherwise, fetch a new token.
        try {
            this.inFlightRequest = (0, getToken_1.getToken)(this.tokenOptions);
            const token = await this.inFlightRequest;
            // Cache the new token and its expiration time.
            this.token = token;
            this.tokenExpiresAt =
                new Date().getTime() + (token.expires_in ?? 0) * 1000;
            return token;
        }
        finally {
            // Clear the in-flight request promise once it's settled.
            this.inFlightRequest = undefined;
        }
    }
}
exports.TokenHandler = TokenHandler;
//# sourceMappingURL=tokenHandler.js.map