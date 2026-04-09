export type AuthToken = {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
};
export declare class RedoclyOAuthDeviceFlow {
    private baseUrl;
    private clientName;
    private version;
    private apiClient;
    constructor(baseUrl: string, clientName: string, version: string);
    run(): Promise<AuthToken>;
    private openBrowser;
    verifyToken(accessToken: string): Promise<boolean>;
    verifyApiKey(apiKey: string): Promise<boolean>;
    refreshToken(refreshToken: string): Promise<{
        access_token: any;
        refresh_token: any;
        expires_in: any;
    }>;
    private pollingAccessToken;
    private getAccessToken;
    private getDeviceCode;
    private sendRequest;
}
