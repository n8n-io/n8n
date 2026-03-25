/**
 * (C) Copyright IBM Corp. 2021, 2024.
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
import logger from '../../lib/logger';
import { atMostOne, getCurrentTime } from '../utils/helpers';
import { buildUserAgent } from '../../lib/build-user-agent';
import { JwtTokenManager } from './jwt-token-manager';
const DEFAULT_IMS_ENDPOINT = 'http://169.254.169.254';
const METADATA_SERVICE_VERSION = '2022-03-01';
const IAM_EXPIRATION_WINDOW = 10;
/**
 * Token Manager for VPC Instance Authentication.
 */
export class VpcInstanceTokenManager extends JwtTokenManager {
    /**
     * Create a new VpcInstanceTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    constructor(options) {
        // all parameters are optional
        options = options || {};
        super(options);
        if (!atMostOne(options.iamProfileId, options.iamProfileCrn)) {
            throw new Error('At most one of `iamProfileId` or `iamProfileCrn` may be specified.');
        }
        this.url = options.url || DEFAULT_IMS_ENDPOINT;
        if (options.iamProfileCrn) {
            this.iamProfileCrn = options.iamProfileCrn;
        }
        if (options.iamProfileId) {
            this.iamProfileId = options.iamProfileId;
        }
        this.userAgent = buildUserAgent('vpc-instance-authenticator');
    }
    /**
     * Sets the CRN of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileCrn - the CRN of the IAM trusted profile
     */
    setIamProfileCrn(iamProfileCrn) {
        this.iamProfileCrn = iamProfileCrn;
    }
    /**
     * Sets the Id of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId) {
        this.iamProfileId = iamProfileId;
    }
    requestToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const instanceIdentityToken = yield this.getInstanceIdentityToken();
            // construct request body
            let body;
            if (this.iamProfileId) {
                body = {
                    trusted_profile: { id: this.iamProfileId },
                };
            }
            else if (this.iamProfileCrn) {
                body = {
                    trusted_profile: { crn: this.iamProfileCrn },
                };
            }
            const parameters = {
                options: {
                    url: `${this.url}/instance_identity/v1/iam_token`,
                    qs: {
                        version: METADATA_SERVICE_VERSION,
                    },
                    body,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': this.userAgent,
                        Accept: 'application/json',
                        Authorization: `Bearer ${instanceIdentityToken}`,
                    },
                },
            };
            logger.debug(`Invoking VPC 'create_iam_token' operation: ${parameters.options.url}`);
            return this.requestWrapperInstance.sendRequest(parameters).then((response) => {
                logger.debug(`Returned from VPC 'create_iam_token' operation`);
                return response;
            });
        });
    }
    getInstanceIdentityToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const parameters = {
                options: {
                    url: `${this.url}/instance_identity/v1/token`,
                    qs: {
                        version: METADATA_SERVICE_VERSION,
                    },
                    body: {
                        expires_in: 300,
                    },
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': this.userAgent,
                        Accept: 'application/json',
                        'Metadata-Flavor': 'ibm',
                    },
                },
            };
            let token = null;
            try {
                logger.debug(`Invoking VPC 'create_access_token' operation: ${parameters.options.url}`);
                const response = yield this.requestWrapperInstance.sendRequest(parameters);
                logger.debug(`Returned from VPC 'create_access_token' operation.`);
                const responseBody = response.result || {};
                token = responseBody.access_token;
            }
            catch (err) {
                logger.debug(`Caught exception from VPC 'create_access_token' operation: ${err.message}`);
                throw err;
            }
            return token;
        });
    }
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    isTokenExpired() {
        const { expireTime } = this;
        if (!expireTime) {
            return true;
        }
        const currentTime = getCurrentTime();
        return currentTime >= expireTime - IAM_EXPIRATION_WINDOW;
    }
}
