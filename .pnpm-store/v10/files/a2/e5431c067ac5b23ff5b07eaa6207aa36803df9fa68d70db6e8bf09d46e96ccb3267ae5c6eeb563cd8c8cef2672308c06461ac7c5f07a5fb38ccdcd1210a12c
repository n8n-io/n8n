type Level = 'warning' | 'error' | 'fatal' | 'info';
type ReportingOptions = {
    level?: Level;
    name?: string;
    statusCode?: number;
};
declare class ApplicationError extends Error {
    level: Level;
    name: string;
    statusCode?: number;
    constructor(message: string, { level, name, statusCode }?: Partial<ErrorOptions> & ReportingOptions);
}
declare class APIResponseError extends ApplicationError {
    constructor(message: string, statusCode?: number);
}
declare class AuthError extends ApplicationError {
    constructor(message: string);
}

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
interface User {
    id: string;
}
type SchemaType = 'string' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'array' | 'object' | 'function' | 'null' | 'undefined';
type Schema = {
    type: SchemaType;
    key?: string;
    value: string | Schema[];
    path: string;
};
declare namespace AiAssistantSDK {
    interface ApplySuggestionResponse {
        sessionId: string;
        parameters: object;
    }
    interface ChatRequestPayload {
        payload: object;
        sessionId?: string;
    }
    interface ChatResponsePayload {
        sessionId?: string;
        messages: object[];
    }
    interface AskAiRequestPayload {
        question: string;
        context: {
            schema: Array<{
                nodeName: string;
                schema: Schema;
            }>;
            inputSchema: {
                nodeName: string;
                schema: Schema;
            };
            pushRef: string;
            ndvPushRef: string;
        };
        forNode: string;
    }
    interface AskAiResponsePayload {
        code: string;
    }
    interface AiCreditResponsePayload {
        apiKey: string;
        url: string;
    }
    interface BuilderApiProxyTokenResponse {
        accessToken: string;
        tokenType: string;
    }
    interface BuilderInstanceCreditsRequest {
        licenseCert: string;
    }
    interface BuilderInstanceCreditsResponse {
        creditsQuota: number;
        creditsClaimed: number;
    }
}

declare class AiAssistantClient {
    private licenseCert;
    private consumerId;
    private n8nVersion;
    private instanceId;
    private baseUrl;
    private logLevel;
    private activeToken;
    /**
     * Create a client for the AI service.
     * @param licenseCert - The license certificate. You can get it from the n8n.
     * @param consumerId - The consumer ID.
     * @param n8nVersion - The n8n version.
     * @param instanceId - The n8n instance ID.
     * @param baseUrl - The base URL of the AI service API.
     * @returns {RequestHandler}
     */
    constructor({ licenseCert, consumerId, n8nVersion, instanceId, baseUrl, logLevel, }: {
        licenseCert: string;
        consumerId: string;
        n8nVersion: string;
        instanceId: string;
        baseUrl?: string;
        logLevel?: LogLevel;
    });
    chat(payload: AiAssistantSDK.ChatRequestPayload, user: User): Promise<Response>;
    applySuggestion(payload: {
        sessionId: string;
        suggestionId: string;
    }, user: User): Promise<AiAssistantSDK.ApplySuggestionResponse>;
    askAi(payload: AiAssistantSDK.AskAiRequestPayload, user: User): Promise<AiAssistantSDK.AskAiResponsePayload>;
    generateAiCreditsCredentials(user: User): Promise<AiAssistantSDK.AiCreditResponsePayload>;
    getApiProxyBaseUrl(): string;
    /**
     * Update the license certificate and clear the active token.
     * This should be called when the license is renewed or changed.
     * @param licenseCert - The new license certificate.
     */
    updateLicenseCert(licenseCert: string): void;
    getBuilderApiProxyToken(user: User, options?: {
        userMessageId?: string;
    }): Promise<AiAssistantSDK.BuilderApiProxyTokenResponse>;
    markBuilderSuccess(user: User, headers: {
        Authorization: string;
    }): Promise<{
        creditsQuota: number;
        creditsClaimed: number;
    }>;
    getBuilderInstanceCredits(user: User): Promise<AiAssistantSDK.BuilderInstanceCreditsResponse>;
    private getHeadersWithAuthToken;
    private getHeaders;
    private refreshAuthToken;
    private postRequest;
    private debug;
}

export { APIResponseError, AiAssistantClient, AiAssistantSDK, AuthError, type SchemaType };
