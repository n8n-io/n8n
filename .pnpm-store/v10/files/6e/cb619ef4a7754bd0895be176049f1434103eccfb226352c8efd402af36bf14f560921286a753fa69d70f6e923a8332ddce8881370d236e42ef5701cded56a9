/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const PREFIX = "msal";
const BROWSER_PREFIX = "browser";
const CACHE_KEY_SEPARATOR = "|";
const CREDENTIAL_SCHEMA_VERSION = 2;
const ACCOUNT_SCHEMA_VERSION = 2;
const LOG_LEVEL_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.level`;
const LOG_PII_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.pii`;
const BROWSER_PERF_ENABLED_KEY = `${PREFIX}.${BROWSER_PREFIX}.performance.enabled`;
const VERSION_CACHE_KEY = `${PREFIX}.version`;
const ACCOUNT_KEYS = "account.keys";
const TOKEN_KEYS = "token.keys";
function getAccountKeysCacheKey(schema = ACCOUNT_SCHEMA_VERSION) {
    if (schema < 1) {
        return `${PREFIX}.${ACCOUNT_KEYS}`;
    }
    return `${PREFIX}.${schema}.${ACCOUNT_KEYS}`;
}
function getTokenKeysCacheKey(clientId, schema = CREDENTIAL_SCHEMA_VERSION) {
    if (schema < 1) {
        return `${PREFIX}.${TOKEN_KEYS}.${clientId}`;
    }
    return `${PREFIX}.${schema}.${TOKEN_KEYS}.${clientId}`;
}

export { ACCOUNT_KEYS, ACCOUNT_SCHEMA_VERSION, BROWSER_PERF_ENABLED_KEY, CACHE_KEY_SEPARATOR, CREDENTIAL_SCHEMA_VERSION, LOG_LEVEL_CACHE_KEY, LOG_PII_CACHE_KEY, PREFIX, TOKEN_KEYS, VERSION_CACHE_KEY, getAccountKeysCacheKey, getTokenKeysCacheKey };
//# sourceMappingURL=CacheKeys.mjs.map
