export declare class RedoclyOAuthClient {
    private clientName;
    private version;
    private dir;
    private cipher;
    private decipher;
    constructor(clientName: string, version: string);
    login(baseUrl: string): Promise<void>;
    logout(): Promise<void>;
    isAuthorized(baseUrl: string, apiKey?: string): Promise<boolean>;
    private saveToken;
    private readToken;
    private removeToken;
}
