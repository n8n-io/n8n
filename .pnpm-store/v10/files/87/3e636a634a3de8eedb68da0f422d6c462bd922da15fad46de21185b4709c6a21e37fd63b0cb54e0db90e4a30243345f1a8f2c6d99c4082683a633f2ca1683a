import { RegistryApi } from './registry-api';
import type { RegionalToken, RegionalTokenWithValidity } from './redocly-client-types';
import type { AccessTokens, Region } from '../config/types';
export declare const TOKEN_FILENAME = ".redocly-config.json";
export declare class RedoclyClient {
    private accessTokens;
    private region;
    domain: string;
    registryApi: RegistryApi;
    constructor(region?: Region);
    loadRegion(region?: Region): Region;
    getRegion(): Region;
    hasTokens(): boolean;
    hasToken(): boolean;
    getAuthorizationHeader(): Promise<string | undefined>;
    setAccessTokens(accessTokens: AccessTokens): void;
    loadTokens(): void;
    getAllTokens(): RegionalToken[];
    getValidTokens(): Promise<RegionalTokenWithValidity[]>;
    getTokens(): Promise<RegionalTokenWithValidity[]>;
    isAuthorizedWithRedoclyByRegion(): Promise<boolean>;
    isAuthorizedWithRedocly(): Promise<boolean>;
    readCredentialsFile(credentialsPath: string): any;
    verifyToken(accessToken: string, verbose?: boolean): Promise<{
        viewerId: string;
        organizations: string[];
    }>;
    login(accessToken: string, verbose?: boolean): Promise<void>;
    logout(): void;
}
