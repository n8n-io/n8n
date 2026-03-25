"use strict";
/**
 * (C) Copyright IBM Corp. 2024.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSecrets = void 0;
// Keywords that should be redacted.
var redactedKeywords = [
    'apikey',
    'api_key',
    'passcode',
    'password',
    'token',
    'aadClientId',
    'aadClientSecret',
    'auth',
    'auth_provider_x509_cert_url',
    'auth_uri',
    'client_email',
    'client_id',
    'client_x509_cert_url',
    'key',
    'project_id',
    'secret',
    'subscriptionId',
    'tenantId',
    'thumbprint',
    'token_uri',
];
var redactedTokens = redactedKeywords.join('|');
// Pre-compiled regular expressions used by redactSecrets().
var reAuthHeader = new RegExp("^(Authorization|X-Auth\\S*): .*$", 'gim');
var rePropertySetting = new RegExp("(".concat(redactedTokens, ")=[^&]*(&|$)"), 'gi');
var reJsonField = new RegExp("\"([^\"]*(".concat(redactedTokens, ")[^\"_]*)\":\\s*\"[^\\,]*\""), 'gi');
// RedactSecrets() returns the input string with secrets redacted.
/**
 * Redacts secrets found in "input" so that the resulting string
 * is suitable for debug logging.
 * @param input - the string that potentially contains secrets
 * @returns the input string with secrets replaced with "[redacted]"
 */
function redactSecrets(input) {
    var redacted = '[redacted]';
    var redactedString = input;
    redactedString = redactedString.replace(reAuthHeader, "$1: ".concat(redacted));
    redactedString = redactedString.replace(rePropertySetting, "$1=".concat(redacted, "$2"));
    redactedString = redactedString.replace(reJsonField, "\"$1\":\"".concat(redacted, "\""));
    return redactedString;
}
exports.redactSecrets = redactSecrets;
