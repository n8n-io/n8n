import { CloudDiscoveryMetadata } from "../../authority/CloudDiscoveryMetadata.js";
import { OpenIdConfigResponse } from "../../authority/OpenIdConfigResponse.js";
import { AuthenticationScheme } from "../../utils/Constants.js";
import { AccessTokenEntity } from "../entities/AccessTokenEntity.js";
import { AppMetadataEntity } from "../entities/AppMetadataEntity.js";
import { AuthorityMetadataEntity } from "../entities/AuthorityMetadataEntity.js";
import { CredentialEntity } from "../entities/CredentialEntity.js";
import { IdTokenEntity } from "../entities/IdTokenEntity.js";
import { RefreshTokenEntity } from "../entities/RefreshTokenEntity.js";
/**
 * Create IdTokenEntity
 * @param homeAccountId
 * @param authenticationResult
 * @param clientId
 * @param authority
 */
export declare function createIdTokenEntity(homeAccountId: string, environment: string, idToken: string, clientId: string, tenantId: string): IdTokenEntity;
/**
 * Create AccessTokenEntity
 * @param homeAccountId
 * @param environment
 * @param accessToken
 * @param clientId
 * @param tenantId
 * @param scopes
 * @param expiresOn
 * @param extExpiresOn
 */
export declare function createAccessTokenEntity(homeAccountId: string, environment: string, accessToken: string, clientId: string, tenantId: string, scopes: string, expiresOn: number, extExpiresOn: number, base64Decode: (input: string) => string, refreshOn?: number, tokenType?: AuthenticationScheme, userAssertionHash?: string, keyId?: string, requestedClaims?: string, requestedClaimsHash?: string): AccessTokenEntity;
/**
 * Create RefreshTokenEntity
 * @param homeAccountId
 * @param authenticationResult
 * @param clientId
 * @param authority
 */
export declare function createRefreshTokenEntity(homeAccountId: string, environment: string, refreshToken: string, clientId: string, familyId?: string, userAssertionHash?: string, expiresOn?: number): RefreshTokenEntity;
export declare function isCredentialEntity(entity: object): entity is CredentialEntity;
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export declare function isAccessTokenEntity(entity: object): entity is AccessTokenEntity;
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export declare function isIdTokenEntity(entity: object): entity is IdTokenEntity;
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export declare function isRefreshTokenEntity(entity: object): entity is RefreshTokenEntity;
/**
 * validates if a given cache entry is "Telemetry", parses <key,value>
 * @param key
 * @param entity
 */
export declare function isServerTelemetryEntity(key: string, entity?: object): boolean;
/**
 * validates if a given cache entry is "Throttling", parses <key,value>
 * @param key
 * @param entity
 */
export declare function isThrottlingEntity(key: string, entity?: object): boolean;
/**
 * Generate AppMetadata Cache Key as per the schema: appmetadata-<environment>-<client_id>
 */
export declare function generateAppMetadataKey({ environment, clientId, }: AppMetadataEntity): string;
export declare function isAppMetadataEntity(key: string, entity: object): boolean;
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export declare function isAuthorityMetadataEntity(key: string, entity: object): boolean;
/**
 * Reset the exiresAt value
 */
export declare function generateAuthorityMetadataExpiresAt(): number;
export declare function updateAuthorityEndpointMetadata(authorityMetadata: AuthorityMetadataEntity, updatedValues: OpenIdConfigResponse, fromNetwork: boolean): void;
export declare function updateCloudDiscoveryMetadata(authorityMetadata: AuthorityMetadataEntity, updatedValues: CloudDiscoveryMetadata, fromNetwork: boolean): void;
/**
 * Returns whether or not the data needs to be refreshed
 */
export declare function isAuthorityMetadataExpired(metadata: AuthorityMetadataEntity): boolean;
//# sourceMappingURL=CacheHelpers.d.ts.map