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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { onlyOne, validateInput } from '../utils/helpers';
import { buildUserAgent } from '../../lib/build-user-agent';
import { IamRequestBasedTokenManager } from './iam-request-based-token-manager';
import { IamTokenManager } from './iam-token-manager';
/**
 * The IamAssumeTokenManager takes an api key, along with trusted profile information, and performs
 * the necessary interactions with the IAM token service to obtain and store a suitable bearer token
 * that "assumes" the identify of the trusted profile.
 */
export class IamAssumeTokenManager extends IamRequestBasedTokenManager {
    /**
     *
     * Create a new IamAssumeTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options) {
        super(options);
        this.requiredOptions = ['apikey'];
        // This just verifies that the API key is provided and is free of common issues.
        validateInput(options, this.requiredOptions);
        // This validates the assume-specific fields.
        // Only one of the following three options may be specified.
        if (!onlyOne(options.iamProfileId, options.iamProfileCrn, options.iamProfileName)) {
            throw new Error('Exactly one of `iamProfileName`, `iamProfileCrn`, or `iamProfileId` must be specified.');
        }
        // `iamAccountId` may only be specified if `iamProfileName` is also specified.
        if (Boolean(options.iamProfileName) !== Boolean(options.iamAccountId)) {
            throw new Error('`iamProfileName` and `iamAccountId` must be provided together, or not at all.');
        }
        // Set class variables from options. If they are 'undefined' in options,
        // they won't be changed, as they are 'undefined' to begin with.
        this.iamProfileId = options.iamProfileId;
        this.iamProfileCrn = options.iamProfileCrn;
        this.iamProfileName = options.iamProfileName;
        this.iamAccountId = options.iamAccountId;
        this.iamDelegate = options.iamDelegate;
        // Create an instance of the IamTokenManager, which will be used to obtain
        // an IAM access token for use in the "assume" token exchange. Most option
        // names are shared between these token manager, and extraneous options will
        // be ignored, so we can pass the options structure to that constructor as-is.
        this.iamDelegate = new IamTokenManager(options);
        // These options are used by the delegate token manager
        // but they are not supported by this token manager.
        this.clientId = undefined;
        this.clientSecret = undefined;
        this.scope = undefined;
        // Set the grant type and user agent for this flavor of authentication.
        this.formData.grant_type = 'urn:ibm:params:oauth:grant-type:assume';
        this.userAgent = buildUserAgent('iam-assume-authenticator');
    }
    /**
     * Request an IAM token using a standard access token and a trusted profile.
     */
    requestToken() {
        const _super = Object.create(null, {
            requestToken: { get: () => super.requestToken }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // First, retrieve a standard IAM access token from the delegate and set it in the form data.
            this.formData.access_token = yield this.iamDelegate.getToken();
            if (this.iamProfileCrn) {
                this.formData.profile_crn = this.iamProfileCrn;
            }
            else if (this.iamProfileId) {
                this.formData.profile_id = this.iamProfileId;
            }
            else {
                this.formData.profile_name = this.iamProfileName;
                this.formData.account = this.iamAccountId;
            }
            return _super.requestToken.call(this);
        });
    }
    /**
     * Extend this method from the parent class to erase the refresh token from
     * the class - we do not want to expose it for IAM Assume authentication.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    saveTokenInfo(tokenResponse) {
        super.saveTokenInfo(tokenResponse);
        this.refreshToken = undefined;
    }
    // Override the inherited "setters". This token manager does not store these options
    // but they can adjust properties on the stored IAM delegate.
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter in the IAM delegate request.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope) {
        this.iamDelegate.setScope(scope);
    }
    /**
     * Sets the IAM "clientId" and "clientSecret" values for the IAM delegate.
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId, clientSecret) {
        this.iamDelegate.setClientIdAndSecret(clientId, clientSecret);
    }
    /**
     * Sets the "disableSslVerification" property for the IAM delegate.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value) {
        super.setDisableSslVerification(value);
        this.iamDelegate.setDisableSslVerification(value);
    }
    /**
     * Sets the headers to be included in the IAM delegate's requests.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers) {
        super.setHeaders(headers);
        this.iamDelegate.setHeaders(headers);
    }
}
