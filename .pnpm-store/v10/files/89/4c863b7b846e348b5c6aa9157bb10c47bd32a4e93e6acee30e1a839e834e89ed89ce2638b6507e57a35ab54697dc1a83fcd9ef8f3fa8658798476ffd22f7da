export declare function getVercelDataDir(): string | null;
export declare function getVercelCliToken(): Promise<string | null>;
interface VercelTokenResponse {
    token: string;
}
export declare function getVercelOidcToken(authToken: string, projectId: string, teamId?: string): Promise<VercelTokenResponse | null>;
export declare function assertVercelOidcTokenResponse(res: unknown): asserts res is VercelTokenResponse;
export declare function findProjectInfo(): {
    projectId: string;
    teamId: string;
};
export declare function saveToken(token: VercelTokenResponse, projectId: string): void;
export declare function loadToken(projectId: string): VercelTokenResponse | null;
interface TokenPayload {
    sub: string;
    name: string;
    exp: number;
}
export declare function getTokenPayload(token: string): TokenPayload;
export declare function isExpired(token: TokenPayload): boolean;
export {};
