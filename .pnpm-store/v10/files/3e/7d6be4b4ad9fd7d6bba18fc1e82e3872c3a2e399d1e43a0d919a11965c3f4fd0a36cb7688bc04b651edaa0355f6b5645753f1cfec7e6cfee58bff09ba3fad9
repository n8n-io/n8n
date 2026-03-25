import { OAuthClientProvider } from '../../client/auth.js';
import { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '../../shared/auth.js';
/**
 * In-memory OAuth client provider for demonstration purposes
 * In production, you should persist tokens securely
 */
export declare class InMemoryOAuthClientProvider implements OAuthClientProvider {
    private readonly _redirectUrl;
    private readonly _clientMetadata;
    readonly clientMetadataUrl?: string | undefined;
    private _clientInformation?;
    private _tokens?;
    private _codeVerifier?;
    constructor(_redirectUrl: string | URL, _clientMetadata: OAuthClientMetadata, onRedirect?: (url: URL) => void, clientMetadataUrl?: string | undefined);
    private _onRedirect;
    get redirectUrl(): string | URL;
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): OAuthClientInformationMixed | undefined;
    saveClientInformation(clientInformation: OAuthClientInformationMixed): void;
    tokens(): OAuthTokens | undefined;
    saveTokens(tokens: OAuthTokens): void;
    redirectToAuthorization(authorizationUrl: URL): void;
    saveCodeVerifier(codeVerifier: string): void;
    codeVerifier(): string;
}
//# sourceMappingURL=simpleOAuthClientProvider.d.ts.map