/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const PREFIX = "msal";
const BROWSER_PREFIX = "browser";
export const CACHE_KEY_SEPARATOR = "|";
export const CREDENTIAL_SCHEMA_VERSION = 2;
export const ACCOUNT_SCHEMA_VERSION = 2;

export const LOG_LEVEL_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.level`;
export const LOG_PII_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.pii`;
export const BROWSER_PERF_ENABLED_KEY = `${PREFIX}.${BROWSER_PREFIX}.performance.enabled`;
export const PLATFORM_AUTH_DOM_SUPPORT = `${PREFIX}.${BROWSER_PREFIX}.platform.auth.dom`;
export const VERSION_CACHE_KEY = `${PREFIX}.version`;
export const ACCOUNT_KEYS = "account.keys";
export const TOKEN_KEYS = "token.keys";

export function getAccountKeysCacheKey(
    schema: number = ACCOUNT_SCHEMA_VERSION
): string {
    if (schema < 1) {
        return `${PREFIX}.${ACCOUNT_KEYS}`;
    }

    return `${PREFIX}.${schema}.${ACCOUNT_KEYS}`;
}

export function getTokenKeysCacheKey(
    clientId: string,
    schema: number = CREDENTIAL_SCHEMA_VERSION
): string {
    if (schema < 1) {
        return `${PREFIX}.${TOKEN_KEYS}.${clientId}`;
    }

    return `${PREFIX}.${schema}.${TOKEN_KEYS}.${clientId}`;
}
