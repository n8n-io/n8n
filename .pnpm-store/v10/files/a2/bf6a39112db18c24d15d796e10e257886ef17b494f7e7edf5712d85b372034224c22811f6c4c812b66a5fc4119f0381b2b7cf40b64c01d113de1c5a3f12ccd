import { AxiosInstance } from 'axios';
import { ConversationReference } from '@microsoft/agents-activity';
import { AadResourceUrls, SignInResource, TokenExchangeRequest, TokenOrSinginResourceResponse, TokenResponse, TokenStatus } from './userTokenClient.types';
import { AuthProvider } from '../auth';
import { HeaderPropagationCollection } from '../headerPropagation';
/**
 * Client for managing user tokens.
 */
export declare class UserTokenClient {
    client: AxiosInstance;
    private msAppId;
    /**
     * Creates a new instance of UserTokenClient.
     * @param msAppId The Microsoft application ID.
     */
    constructor(msAppId: string);
    /**
     * Creates a new instance of UserTokenClient.
     * @param axiosInstance The axios instance.
     */
    constructor(axiosInstance: AxiosInstance);
    /**
     * Creates a new instance of UserTokenClient with authentication.
     * @param baseURL - The base URL for the API.
     * @param authConfig - The authentication configuration.
     * @param authProvider - The authentication provider.
     * @param scope - The scope for the authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static createClientWithScope(baseURL: string, authProvider: AuthProvider, scope: string, headers?: HeaderPropagationCollection): Promise<UserTokenClient>;
    /**
     * Gets the user token.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param userId The user ID.
     * @param code The optional code.
     * @returns A promise that resolves to the user token.
     */
    getUserToken(connectionName: string, channelIdComposite: string, userId: string, code?: string): Promise<TokenResponse>;
    /**
     * Signs the user out.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @returns A promise that resolves when the sign-out operation is complete.
     */
    signOut(userId: string, connectionName: string, channelIdComposite: string): Promise<void>;
    /**
     * Gets the sign-in resource.
     * @param msAppId The application ID.
     * @param connectionName The connection name.
     * @param conversation The conversation reference.
     * @param relatesTo Optional. The related conversation reference.
     * @returns A promise that resolves to the signing resource.
     */
    getSignInResource(msAppId: string, connectionName: string, conversation: ConversationReference, relatesTo?: ConversationReference): Promise<SignInResource>;
    /**
     * Exchanges the token.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param tokenExchangeRequest The token exchange request.
     * @returns A promise that resolves to the exchanged token.
     */
    exchangeTokenAsync(userId: string, connectionName: string, channelIdComposite: string, tokenExchangeRequest: TokenExchangeRequest): Promise<TokenResponse>;
    /**
     * Gets the token or sign-in resource.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param conversation The conversation reference.
     * @param relatesTo The related conversation reference.
     * @param code The code.
     * @param finalRedirect The final redirect URL.
     * @param fwdUrl The forward URL.
     * @returns A promise that resolves to the token or sign-in resource response.
     */
    getTokenOrSignInResource(userId: string, connectionName: string, channelIdComposite: string, conversation: ConversationReference, relatesTo: ConversationReference, code: string, finalRedirect?: string, fwdUrl?: string): Promise<TokenOrSinginResourceResponse>;
    /**
     * Gets the token status.
     * @param userId The user ID.
     * @param channelIdComposite The channel ID.
     * @param include The optional include parameter.
     * @returns A promise that resolves to the token status.
     */
    getTokenStatus(userId: string, channelIdComposite: string, include?: string): Promise<TokenStatus[]>;
    /**
     * Gets the AAD tokens.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param resourceUrls The resource URLs.
     * @returns A promise that resolves to the AAD tokens.
     */
    getAadTokens(userId: string, connectionName: string, channelIdComposite: string, resourceUrls: AadResourceUrls): Promise<Record<string, TokenResponse>>;
    updateAuthToken(token: string): void;
}
