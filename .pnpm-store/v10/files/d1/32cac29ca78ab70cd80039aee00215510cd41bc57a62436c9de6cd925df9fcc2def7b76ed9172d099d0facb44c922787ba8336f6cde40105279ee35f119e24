// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const validWWWAuthenticateProperties = [
    "authorization",
    "authorization_url",
    "resource",
    "scope",
    "tenantId",
    "claims",
    "error",
];
/**
 * Parses an WWW-Authenticate response header.
 * This transforms a string value like:
 * `Bearer authorization="https://some.url/tenantId", resource="https://some.url"`
 * into an object like:
 * `{ authorization: "https://some.url/tenantId", resource: "https://some.url" }`
 * @param headerValue - String value in the WWW-Authenticate header
 */
export function parseWWWAuthenticateHeader(headerValue) {
    const pairDelimiter = /,? +/;
    const parsed = headerValue.split(pairDelimiter).reduce((kvPairs, p) => {
        if (p.match(/\w="/)) {
            // 'sampleKey="sample_value"' -> [sampleKey, "sample_value"] -> { sampleKey: sample_value }
            const [key, ...value] = p.split("=");
            if (validWWWAuthenticateProperties.includes(key)) {
                // The values will be wrapped in quotes, which need to be stripped out.
                return Object.assign(Object.assign({}, kvPairs), { [key]: value.join("=").slice(1, -1) });
            }
        }
        return kvPairs;
    }, {});
    // Finally, we pull the tenantId from the authorization header to support multi-tenant authentication.
    if (parsed.authorization) {
        try {
            const tenantId = new URL(parsed.authorization).pathname.substring(1);
            if (tenantId) {
                parsed.tenantId = tenantId;
            }
        }
        catch (_) {
            throw new Error(`The challenge authorization URI '${parsed.authorization}' is invalid.`);
        }
    }
    return parsed;
}
//# sourceMappingURL=parseWWWAuthenticate.js.map