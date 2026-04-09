"use strict";
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPayloadForJwsSign = buildPayloadForJwsSign;
exports.getJwsSign = getJwsSign;
const jws_1 = require("jws");
/** The default algorithm for signing JWTs. */
const ALG_RS256 = 'RS256';
/** The URL for Google's OAuth 2.0 token endpoint. */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
/**
 * Builds the JWT payload for signing.
 * @param tokenOptions The options for the token.
 * @returns The JWT payload.
 */
function buildPayloadForJwsSign(tokenOptions) {
    const iat = Math.floor(new Date().getTime() / 1000);
    const payload = {
        iss: tokenOptions.iss,
        scope: tokenOptions.scope,
        aud: GOOGLE_TOKEN_URL,
        exp: iat + 3600,
        iat,
        sub: tokenOptions.sub,
        ...tokenOptions.additionalClaims,
    };
    return payload;
}
/**
 * Creates a signed JWS (JSON Web Signature).
 * @param tokenOptions The options for the token.
 * @returns The signed JWS.
 */
function getJwsSign(tokenOptions) {
    const payload = buildPayloadForJwsSign(tokenOptions);
    return (0, jws_1.sign)({
        header: { alg: ALG_RS256 },
        payload,
        secret: tokenOptions.key,
    });
}
//# sourceMappingURL=jwsSign.js.map