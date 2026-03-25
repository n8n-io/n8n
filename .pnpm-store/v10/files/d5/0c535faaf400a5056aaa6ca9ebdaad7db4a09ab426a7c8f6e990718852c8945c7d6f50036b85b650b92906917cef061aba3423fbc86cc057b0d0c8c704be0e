"use strict";
// Copyright 2021 Google LLC
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
exports.IdentityPoolClient = void 0;
const baseexternalclient_1 = require("./baseexternalclient");
const util_1 = require("../util");
const filesubjecttokensupplier_1 = require("./filesubjecttokensupplier");
const urlsubjecttokensupplier_1 = require("./urlsubjecttokensupplier");
/**
 * Defines the Url-sourced and file-sourced external account clients mainly
 * used for K8s and Azure workloads.
 */
class IdentityPoolClient extends baseexternalclient_1.BaseExternalAccountClient {
    /**
     * Instantiate an IdentityPoolClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid file-sourced or
     * url-sourced credential or a workforce pool user project is provided
     * with a non workforce audience.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file. The camelCased options
     *   are aliases for the snake_cased options.
     * @param additionalOptions **DEPRECATED, all options are available in the
     *   `options` parameter.** Optional additional behavior customization options.
     *   These currently customize expiration threshold time and whether to retry
     *   on 401/403 API request errors.
     */
    constructor(options, additionalOptions) {
        super(options, additionalOptions);
        const opts = (0, util_1.originalOrCamelOptions)(options);
        const credentialSource = opts.get('credential_source');
        const subjectTokenSupplier = opts.get('subject_token_supplier');
        // Validate credential sourcing configuration.
        if (!credentialSource && !subjectTokenSupplier) {
            throw new Error('A credential source or subject token supplier must be specified.');
        }
        if (credentialSource && subjectTokenSupplier) {
            throw new Error('Only one of credential source or subject token supplier can be specified.');
        }
        if (subjectTokenSupplier) {
            this.subjectTokenSupplier = subjectTokenSupplier;
            this.credentialSourceType = 'programmatic';
        }
        else {
            const credentialSourceOpts = (0, util_1.originalOrCamelOptions)(credentialSource);
            const formatOpts = (0, util_1.originalOrCamelOptions)(credentialSourceOpts.get('format'));
            // Text is the default format type.
            const formatType = formatOpts.get('type') || 'text';
            const formatSubjectTokenFieldName = formatOpts.get('subject_token_field_name');
            if (formatType !== 'json' && formatType !== 'text') {
                throw new Error(`Invalid credential_source format "${formatType}"`);
            }
            if (formatType === 'json' && !formatSubjectTokenFieldName) {
                throw new Error('Missing subject_token_field_name for JSON credential_source format');
            }
            const file = credentialSourceOpts.get('file');
            const url = credentialSourceOpts.get('url');
            const headers = credentialSourceOpts.get('headers');
            if (file && url) {
                throw new Error('No valid Identity Pool "credential_source" provided, must be either file or url.');
            }
            else if (file && !url) {
                this.credentialSourceType = 'file';
                this.subjectTokenSupplier = new filesubjecttokensupplier_1.FileSubjectTokenSupplier({
                    filePath: file,
                    formatType: formatType,
                    subjectTokenFieldName: formatSubjectTokenFieldName,
                });
            }
            else if (!file && url) {
                this.credentialSourceType = 'url';
                this.subjectTokenSupplier = new urlsubjecttokensupplier_1.UrlSubjectTokenSupplier({
                    url: url,
                    formatType: formatType,
                    subjectTokenFieldName: formatSubjectTokenFieldName,
                    headers: headers,
                    additionalGaxiosOptions: IdentityPoolClient.RETRY_CONFIG,
                });
            }
            else {
                throw new Error('No valid Identity Pool "credential_source" provided, must be either file or url.');
            }
        }
    }
    /**
     * Triggered when a external subject token is needed to be exchanged for a GCP
     * access token via GCP STS endpoint. Gets a subject token by calling
     * the configured {@link SubjectTokenSupplier}
     * @return A promise that resolves with the external subject token.
     */
    async retrieveSubjectToken() {
        return this.subjectTokenSupplier.getSubjectToken(this.supplierContext);
    }
}
exports.IdentityPoolClient = IdentityPoolClient;
