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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _AwsClient_DEFAULT_AWS_REGIONAL_CREDENTIAL_VERIFICATION_URL;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsClient = void 0;
const awsrequestsigner_1 = require("./awsrequestsigner");
const baseexternalclient_1 = require("./baseexternalclient");
const defaultawssecuritycredentialssupplier_1 = require("./defaultawssecuritycredentialssupplier");
const util_1 = require("../util");
/**
 * AWS external account client. This is used for AWS workloads, where
 * AWS STS GetCallerIdentity serialized signed requests are exchanged for
 * GCP access token.
 */
class AwsClient extends baseexternalclient_1.BaseExternalAccountClient {
    /**
     * Instantiates an AwsClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid AWS credential.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions **DEPRECATED, all options are available in the
     *   `options` parameter.** Optional additional behavior customization options.
     *   These currently customize expiration threshold time and whether to retry
     *   on 401/403 API request errors.
     */
    constructor(options, additionalOptions) {
        super(options, additionalOptions);
        const opts = (0, util_1.originalOrCamelOptions)(options);
        const credentialSource = opts.get('credential_source');
        const awsSecurityCredentialsSupplier = opts.get('aws_security_credentials_supplier');
        // Validate credential sourcing configuration.
        if (!credentialSource && !awsSecurityCredentialsSupplier) {
            throw new Error('A credential source or AWS security credentials supplier must be specified.');
        }
        if (credentialSource && awsSecurityCredentialsSupplier) {
            throw new Error('Only one of credential source or AWS security credentials supplier can be specified.');
        }
        if (awsSecurityCredentialsSupplier) {
            this.awsSecurityCredentialsSupplier = awsSecurityCredentialsSupplier;
            this.regionalCredVerificationUrl =
                __classPrivateFieldGet(_a, _a, "f", _AwsClient_DEFAULT_AWS_REGIONAL_CREDENTIAL_VERIFICATION_URL);
            this.credentialSourceType = 'programmatic';
        }
        else {
            const credentialSourceOpts = (0, util_1.originalOrCamelOptions)(credentialSource);
            this.environmentId = credentialSourceOpts.get('environment_id');
            // This is only required if the AWS region is not available in the
            // AWS_REGION or AWS_DEFAULT_REGION environment variables.
            const regionUrl = credentialSourceOpts.get('region_url');
            // This is only required if AWS security credentials are not available in
            // environment variables.
            const securityCredentialsUrl = credentialSourceOpts.get('url');
            const imdsV2SessionTokenUrl = credentialSourceOpts.get('imdsv2_session_token_url');
            this.awsSecurityCredentialsSupplier =
                new defaultawssecuritycredentialssupplier_1.DefaultAwsSecurityCredentialsSupplier({
                    regionUrl: regionUrl,
                    securityCredentialsUrl: securityCredentialsUrl,
                    imdsV2SessionTokenUrl: imdsV2SessionTokenUrl,
                });
            this.regionalCredVerificationUrl = credentialSourceOpts.get('regional_cred_verification_url');
            this.credentialSourceType = 'aws';
            // Data validators.
            this.validateEnvironmentId();
        }
        this.awsRequestSigner = null;
        this.region = '';
    }
    validateEnvironmentId() {
        var _b;
        const match = (_b = this.environmentId) === null || _b === void 0 ? void 0 : _b.match(/^(aws)(\d+)$/);
        if (!match || !this.regionalCredVerificationUrl) {
            throw new Error('No valid AWS "credential_source" provided');
        }
        else if (parseInt(match[2], 10) !== 1) {
            throw new Error(`aws version "${match[2]}" is not supported in the current build.`);
        }
    }
    /**
     * Triggered when an external subject token is needed to be exchanged for a
     * GCP access token via GCP STS endpoint. This will call the
     * {@link AwsSecurityCredentialsSupplier} to retrieve an AWS region and AWS
     * Security Credentials, then use them to create a signed AWS STS request that
     * can be exchanged for a GCP access token.
     * @return A promise that resolves with the external subject token.
     */
    async retrieveSubjectToken() {
        // Initialize AWS request signer if not already initialized.
        if (!this.awsRequestSigner) {
            this.region = await this.awsSecurityCredentialsSupplier.getAwsRegion(this.supplierContext);
            this.awsRequestSigner = new awsrequestsigner_1.AwsRequestSigner(async () => {
                return this.awsSecurityCredentialsSupplier.getAwsSecurityCredentials(this.supplierContext);
            }, this.region);
        }
        // Generate signed request to AWS STS GetCallerIdentity API.
        // Use the required regional endpoint. Otherwise, the request will fail.
        const options = await this.awsRequestSigner.getRequestOptions({
            ..._a.RETRY_CONFIG,
            url: this.regionalCredVerificationUrl.replace('{region}', this.region),
            method: 'POST',
        });
        // The GCP STS endpoint expects the headers to be formatted as:
        // [
        //   {key: 'x-amz-date', value: '...'},
        //   {key: 'Authorization', value: '...'},
        //   ...
        // ]
        // And then serialized as:
        // encodeURIComponent(JSON.stringify({
        //   url: '...',
        //   method: 'POST',
        //   headers: [{key: 'x-amz-date', value: '...'}, ...]
        // }))
        const reformattedHeader = [];
        const extendedHeaders = Object.assign({
            // The full, canonical resource name of the workload identity pool
            // provider, with or without the HTTPS prefix.
            // Including this header as part of the signature is recommended to
            // ensure data integrity.
            'x-goog-cloud-target-resource': this.audience,
        }, options.headers);
        // Reformat header to GCP STS expected format.
        for (const key in extendedHeaders) {
            reformattedHeader.push({
                key,
                value: extendedHeaders[key],
            });
        }
        // Serialize the reformatted signed request.
        return encodeURIComponent(JSON.stringify({
            url: options.url,
            method: options.method,
            headers: reformattedHeader,
        }));
    }
}
exports.AwsClient = AwsClient;
_a = AwsClient;
_AwsClient_DEFAULT_AWS_REGIONAL_CREDENTIAL_VERIFICATION_URL = { value: 'https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15' };
/**
 * @deprecated AWS client no validates the EC2 metadata address.
 **/
AwsClient.AWS_EC2_METADATA_IPV4_ADDRESS = '169.254.169.254';
/**
 * @deprecated AWS client no validates the EC2 metadata address.
 **/
AwsClient.AWS_EC2_METADATA_IPV6_ADDRESS = 'fd00:ec2::254';
