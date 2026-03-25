"use strict";
// Copyright 2024 Google LLC
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
exports.UrlSubjectTokenSupplier = void 0;
const authclient_1 = require("./authclient");
/**
 * Internal subject token supplier implementation used when a URL
 * is configured in the credential configuration used to build an {@link IdentityPoolClient}
 */
class UrlSubjectTokenSupplier {
    url;
    headers;
    formatType;
    subjectTokenFieldName;
    additionalGaxiosOptions;
    /**
     * Instantiates a URL subject token supplier.
     * @param opts The URL subject token supplier options to build the supplier with.
     */
    constructor(opts) {
        this.url = opts.url;
        this.formatType = opts.formatType;
        this.subjectTokenFieldName = opts.subjectTokenFieldName;
        this.headers = opts.headers;
        this.additionalGaxiosOptions = opts.additionalGaxiosOptions;
    }
    /**
     * Sends a GET request to the URL provided in the constructor and resolves
     * with the returned external subject token.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link IdentityPoolClient}, contains the requested audience and subject
     *   token type for the external account identity. Not used.
     */
    async getSubjectToken(context) {
        const opts = {
            ...this.additionalGaxiosOptions,
            url: this.url,
            method: 'GET',
            headers: this.headers,
        };
        authclient_1.AuthClient.setMethodName(opts, 'getSubjectToken');
        let subjectToken;
        if (this.formatType === 'text') {
            const response = await context.transporter.request(opts);
            subjectToken = response.data;
        }
        else if (this.formatType === 'json' && this.subjectTokenFieldName) {
            const response = await context.transporter.request(opts);
            subjectToken = response.data[this.subjectTokenFieldName];
        }
        if (!subjectToken) {
            throw new Error('Unable to parse the subject_token from the credential_source URL');
        }
        return subjectToken;
    }
}
exports.UrlSubjectTokenSupplier = UrlSubjectTokenSupplier;
//# sourceMappingURL=urlsubjecttokensupplier.js.map