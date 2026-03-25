// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AggregateAuthenticationError, CredentialUnavailableError } from "../errors.js";
import { credentialLogger, formatError, formatSuccess } from "../util/logging.js";
import { tracingClient } from "../util/tracing.js";
/**
 * @internal
 */
export const logger = credentialLogger("ChainedTokenCredential");
/**
 * Enables multiple `TokenCredential` implementations to be tried in order until
 * one of the getToken methods returns an access token. For more information, see
 * [ChainedTokenCredential overview](https://aka.ms/azsdk/js/identity/credential-chains#use-chainedtokencredential-for-granularity).
 */
export class ChainedTokenCredential {
    _sources = [];
    /**
     * Creates an instance of ChainedTokenCredential using the given credentials.
     *
     * @param sources - `TokenCredential` implementations to be tried in order.
     *
     * Example usage:
     * ```ts snippet:chained_token_credential_example
     * import { ClientSecretCredential, ChainedTokenCredential } from "@azure/identity";
     *
     * const tenantId = "<tenant-id>";
     * const clientId = "<client-id>";
     * const clientSecret = "<client-secret>";
     * const anotherClientId = "<another-client-id>";
     * const anotherSecret = "<another-client-secret>";
     *
     * const firstCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
     * const secondCredential = new ClientSecretCredential(tenantId, anotherClientId, anotherSecret);
     *
     * const credentialChain = new ChainedTokenCredential(firstCredential, secondCredential);
     * ```
     */
    constructor(...sources) {
        this._sources = sources;
    }
    /**
     * Returns the first access token returned by one of the chained
     * `TokenCredential` implementations.  Throws an {@link AggregateAuthenticationError}
     * when one or more credentials throws an {@link AuthenticationError} and
     * no credentials have returned an access token.
     *
     * This method is called automatically by Azure SDK client libraries. You may call this method
     * directly, but you must also handle token caching and token refreshing.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                `TokenCredential` implementation might make.
     */
    async getToken(scopes, options = {}) {
        const { token } = await this.getTokenInternal(scopes, options);
        return token;
    }
    async getTokenInternal(scopes, options = {}) {
        let token = null;
        let successfulCredential;
        const errors = [];
        return tracingClient.withSpan("ChainedTokenCredential.getToken", options, async (updatedOptions) => {
            for (let i = 0; i < this._sources.length && token === null; i++) {
                try {
                    token = await this._sources[i].getToken(scopes, updatedOptions);
                    successfulCredential = this._sources[i];
                }
                catch (err) {
                    if (err.name === "CredentialUnavailableError" ||
                        err.name === "AuthenticationRequiredError") {
                        errors.push(err);
                    }
                    else {
                        logger.getToken.info(formatError(scopes, err));
                        throw err;
                    }
                }
            }
            if (!token && errors.length > 0) {
                const err = new AggregateAuthenticationError(errors, "ChainedTokenCredential authentication failed.");
                logger.getToken.info(formatError(scopes, err));
                throw err;
            }
            logger.getToken.info(`Result for ${successfulCredential.constructor.name}: ${formatSuccess(scopes)}`);
            if (token === null) {
                throw new CredentialUnavailableError("Failed to retrieve a valid token");
            }
            return { token, successfulCredential };
        });
    }
}
//# sourceMappingURL=chainedTokenCredential.js.map