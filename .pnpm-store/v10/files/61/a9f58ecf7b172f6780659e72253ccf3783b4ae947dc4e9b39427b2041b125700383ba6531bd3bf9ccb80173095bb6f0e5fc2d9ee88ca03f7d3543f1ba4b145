/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { extractTokenClaims } from "../../account/AuthToken.js";
import { TokenClaims } from "../../account/TokenClaims.js";
import { CloudDiscoveryMetadata } from "../../authority/CloudDiscoveryMetadata.js";
import { OpenIdConfigResponse } from "../../authority/OpenIdConfigResponse.js";
import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../../error/ClientAuthError.js";
import {
    APP_METADATA,
    AUTHORITY_METADATA_CONSTANTS,
    AuthenticationScheme,
    CredentialType,
    SERVER_TELEM_CONSTANTS,
    Separators,
    ThrottlingConstants,
} from "../../utils/Constants.js";
import * as TimeUtils from "../../utils/TimeUtils.js";
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
export function createIdTokenEntity(
    homeAccountId: string,
    environment: string,
    idToken: string,
    clientId: string,
    tenantId: string
): IdTokenEntity {
    const idTokenEntity: IdTokenEntity = {
        credentialType: CredentialType.ID_TOKEN,
        homeAccountId: homeAccountId,
        environment: environment,
        clientId: clientId,
        secret: idToken,
        realm: tenantId,
        lastUpdatedAt: Date.now().toString(), // Set the last updated time to now
    };

    return idTokenEntity;
}

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
export function createAccessTokenEntity(
    homeAccountId: string,
    environment: string,
    accessToken: string,
    clientId: string,
    tenantId: string,
    scopes: string,
    expiresOn: number,
    extExpiresOn: number,
    base64Decode: (input: string) => string,
    refreshOn?: number,
    tokenType?: AuthenticationScheme,
    userAssertionHash?: string,
    keyId?: string,
    requestedClaims?: string,
    requestedClaimsHash?: string
): AccessTokenEntity {
    const atEntity: AccessTokenEntity = {
        homeAccountId: homeAccountId,
        credentialType: CredentialType.ACCESS_TOKEN,
        secret: accessToken,
        cachedAt: TimeUtils.nowSeconds().toString(),
        expiresOn: expiresOn.toString(),
        extendedExpiresOn: extExpiresOn.toString(),
        environment: environment,
        clientId: clientId,
        realm: tenantId,
        target: scopes,
        tokenType: tokenType || AuthenticationScheme.BEARER,
        lastUpdatedAt: Date.now().toString(), // Set the last updated time to now
    };

    if (userAssertionHash) {
        atEntity.userAssertionHash = userAssertionHash;
    }

    if (refreshOn) {
        atEntity.refreshOn = refreshOn.toString();
    }

    if (requestedClaims) {
        atEntity.requestedClaims = requestedClaims;
        atEntity.requestedClaimsHash = requestedClaimsHash;
    }

    /*
     * Create Access Token With Auth Scheme instead of regular access token
     * Cast to lower to handle "bearer" from ADFS
     */
    if (
        atEntity.tokenType?.toLowerCase() !==
        AuthenticationScheme.BEARER.toLowerCase()
    ) {
        atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
        switch (atEntity.tokenType) {
            case AuthenticationScheme.POP:
                // Make sure keyId is present and add it to credential
                const tokenClaims: TokenClaims | null = extractTokenClaims(
                    accessToken,
                    base64Decode
                );
                if (!tokenClaims?.cnf?.kid) {
                    throw createClientAuthError(
                        ClientAuthErrorCodes.tokenClaimsCnfRequiredForSignedJwt
                    );
                }
                atEntity.keyId = tokenClaims.cnf.kid;
                break;
            case AuthenticationScheme.SSH:
                atEntity.keyId = keyId;
        }
    }

    return atEntity;
}

/**
 * Create RefreshTokenEntity
 * @param homeAccountId
 * @param authenticationResult
 * @param clientId
 * @param authority
 */
export function createRefreshTokenEntity(
    homeAccountId: string,
    environment: string,
    refreshToken: string,
    clientId: string,
    familyId?: string,
    userAssertionHash?: string,
    expiresOn?: number
): RefreshTokenEntity {
    const rtEntity: RefreshTokenEntity = {
        credentialType: CredentialType.REFRESH_TOKEN,
        homeAccountId: homeAccountId,
        environment: environment,
        clientId: clientId,
        secret: refreshToken,
        lastUpdatedAt: Date.now().toString(),
    };

    if (userAssertionHash) {
        rtEntity.userAssertionHash = userAssertionHash;
    }

    if (familyId) {
        rtEntity.familyId = familyId;
    }

    if (expiresOn) {
        rtEntity.expiresOn = expiresOn.toString();
    }

    return rtEntity;
}

export function isCredentialEntity(entity: object): entity is CredentialEntity {
    return (
        entity.hasOwnProperty("homeAccountId") &&
        entity.hasOwnProperty("environment") &&
        entity.hasOwnProperty("credentialType") &&
        entity.hasOwnProperty("clientId") &&
        entity.hasOwnProperty("secret")
    );
}

/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export function isAccessTokenEntity(
    entity: object
): entity is AccessTokenEntity {
    if (!entity) {
        return false;
    }

    return (
        isCredentialEntity(entity) &&
        entity.hasOwnProperty("realm") &&
        entity.hasOwnProperty("target") &&
        (entity["credentialType"] === CredentialType.ACCESS_TOKEN ||
            entity["credentialType"] ===
                CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME)
    );
}

/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export function isIdTokenEntity(entity: object): entity is IdTokenEntity {
    if (!entity) {
        return false;
    }

    return (
        isCredentialEntity(entity) &&
        entity.hasOwnProperty("realm") &&
        entity["credentialType"] === CredentialType.ID_TOKEN
    );
}

/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export function isRefreshTokenEntity(
    entity: object
): entity is RefreshTokenEntity {
    if (!entity) {
        return false;
    }

    return (
        isCredentialEntity(entity) &&
        entity["credentialType"] === CredentialType.REFRESH_TOKEN
    );
}

/**
 * validates if a given cache entry is "Telemetry", parses <key,value>
 * @param key
 * @param entity
 */
export function isServerTelemetryEntity(key: string, entity?: object): boolean {
    const validateKey: boolean =
        key.indexOf(SERVER_TELEM_CONSTANTS.CACHE_KEY) === 0;
    let validateEntity: boolean = true;

    if (entity) {
        validateEntity =
            entity.hasOwnProperty("failedRequests") &&
            entity.hasOwnProperty("errors") &&
            entity.hasOwnProperty("cacheHits");
    }

    return validateKey && validateEntity;
}

/**
 * validates if a given cache entry is "Throttling", parses <key,value>
 * @param key
 * @param entity
 */
export function isThrottlingEntity(key: string, entity?: object): boolean {
    let validateKey: boolean = false;
    if (key) {
        validateKey = key.indexOf(ThrottlingConstants.THROTTLING_PREFIX) === 0;
    }

    let validateEntity: boolean = true;
    if (entity) {
        validateEntity = entity.hasOwnProperty("throttleTime");
    }

    return validateKey && validateEntity;
}

/**
 * Generate AppMetadata Cache Key as per the schema: appmetadata-<environment>-<client_id>
 */
export function generateAppMetadataKey({
    environment,
    clientId,
}: AppMetadataEntity): string {
    const appMetaDataKeyArray: Array<string> = [
        APP_METADATA,
        environment,
        clientId,
    ];
    return appMetaDataKeyArray
        .join(Separators.CACHE_KEY_SEPARATOR)
        .toLowerCase();
}

/*
 * Validates an entity: checks for all expected params
 * @param entity
 */
export function isAppMetadataEntity(key: string, entity: object): boolean {
    if (!entity) {
        return false;
    }

    return (
        key.indexOf(APP_METADATA) === 0 &&
        entity.hasOwnProperty("clientId") &&
        entity.hasOwnProperty("environment")
    );
}

/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
export function isAuthorityMetadataEntity(
    key: string,
    entity: object
): boolean {
    if (!entity) {
        return false;
    }

    return (
        key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) === 0 &&
        entity.hasOwnProperty("aliases") &&
        entity.hasOwnProperty("preferred_cache") &&
        entity.hasOwnProperty("preferred_network") &&
        entity.hasOwnProperty("canonical_authority") &&
        entity.hasOwnProperty("authorization_endpoint") &&
        entity.hasOwnProperty("token_endpoint") &&
        entity.hasOwnProperty("issuer") &&
        entity.hasOwnProperty("aliasesFromNetwork") &&
        entity.hasOwnProperty("endpointsFromNetwork") &&
        entity.hasOwnProperty("expiresAt") &&
        entity.hasOwnProperty("jwks_uri")
    );
}

/**
 * Reset the exiresAt value
 */
export function generateAuthorityMetadataExpiresAt(): number {
    return (
        TimeUtils.nowSeconds() +
        AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS
    );
}

export function updateAuthorityEndpointMetadata(
    authorityMetadata: AuthorityMetadataEntity,
    updatedValues: OpenIdConfigResponse,
    fromNetwork: boolean
): void {
    authorityMetadata.authorization_endpoint =
        updatedValues.authorization_endpoint;
    authorityMetadata.token_endpoint = updatedValues.token_endpoint;
    authorityMetadata.end_session_endpoint = updatedValues.end_session_endpoint;
    authorityMetadata.issuer = updatedValues.issuer;
    authorityMetadata.endpointsFromNetwork = fromNetwork;
    authorityMetadata.jwks_uri = updatedValues.jwks_uri;
}

export function updateCloudDiscoveryMetadata(
    authorityMetadata: AuthorityMetadataEntity,
    updatedValues: CloudDiscoveryMetadata,
    fromNetwork: boolean
): void {
    authorityMetadata.aliases = updatedValues.aliases;
    authorityMetadata.preferred_cache = updatedValues.preferred_cache;
    authorityMetadata.preferred_network = updatedValues.preferred_network;
    authorityMetadata.aliasesFromNetwork = fromNetwork;
}

/**
 * Returns whether or not the data needs to be refreshed
 */
export function isAuthorityMetadataExpired(
    metadata: AuthorityMetadataEntity
): boolean {
    return metadata.expiresAt <= TimeUtils.nowSeconds();
}
