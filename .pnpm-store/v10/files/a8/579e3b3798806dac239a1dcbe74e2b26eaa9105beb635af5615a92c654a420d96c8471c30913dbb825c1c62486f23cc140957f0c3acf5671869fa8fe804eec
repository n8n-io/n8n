"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryOAuthClientProvider = void 0;
/**
 * In-memory OAuth client provider for demonstration purposes
 * In production, you should persist tokens securely
 */
class InMemoryOAuthClientProvider {
    constructor(_redirectUrl, _clientMetadata, onRedirect, clientMetadataUrl) {
        this._redirectUrl = _redirectUrl;
        this._clientMetadata = _clientMetadata;
        this.clientMetadataUrl = clientMetadataUrl;
        this._onRedirect =
            onRedirect ||
                (url => {
                    console.log(`Redirect to: ${url.toString()}`);
                });
    }
    get redirectUrl() {
        return this._redirectUrl;
    }
    get clientMetadata() {
        return this._clientMetadata;
    }
    clientInformation() {
        return this._clientInformation;
    }
    saveClientInformation(clientInformation) {
        this._clientInformation = clientInformation;
    }
    tokens() {
        return this._tokens;
    }
    saveTokens(tokens) {
        this._tokens = tokens;
    }
    redirectToAuthorization(authorizationUrl) {
        this._onRedirect(authorizationUrl);
    }
    saveCodeVerifier(codeVerifier) {
        this._codeVerifier = codeVerifier;
    }
    codeVerifier() {
        if (!this._codeVerifier) {
            throw new Error('No code verifier saved');
        }
        return this._codeVerifier;
    }
}
exports.InMemoryOAuthClientProvider = InMemoryOAuthClientProvider;
//# sourceMappingURL=simpleOAuthClientProvider.js.map