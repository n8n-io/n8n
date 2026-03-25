/**
 * (C) Copyright IBM Corp. 2021, 2025.
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
import { atLeastOne } from '../utils/helpers';
import { readCrTokenFile } from '../utils/file-reading-helpers';
import { buildUserAgent } from '../../lib/build-user-agent';
import { IamRequestBasedTokenManager } from './iam-request-based-token-manager';
const DEFAULT_CR_TOKEN_FILEPATH1 = '/var/run/secrets/tokens/vault-token';
const DEFAULT_CR_TOKEN_FILEPATH2 = '/var/run/secrets/tokens/sa-token';
const DEFAULT_CR_TOKEN_FILEPATH3 = '/var/run/secrets/codeengine.cloud.ibm.com/compute-resource-token/token';
/**
 * The ContainerTokenManager retrieves a compute resource token from a file on the container. This token
 * is used to perform the necessary interactions with the IAM token service to obtain and store a suitable
 * bearer (access) token.
 */
export class ContainerTokenManager extends IamRequestBasedTokenManager {
    /**
     *
     * Create a new ContainerTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default: "https://iam.cloud.ibm.com")
     * - crTokenFilename: (optional) the file containing the compute resource token (default: "/var/run/secrets/tokens/vault-token")
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     *
     * @throws Error: the configuration options were invalid
     */
    constructor(options) {
        // all parameters are optional
        options = options || {};
        super(options);
        if (!atLeastOne(options.iamProfileId, options.iamProfileName)) {
            throw new Error('At least one of `iamProfileName` or `iamProfileId` must be specified.');
        }
        if (options.crTokenFilename) {
            this.crTokenFilename = options.crTokenFilename;
        }
        if (options.iamProfileName) {
            this.iamProfileName = options.iamProfileName;
        }
        if (options.iamProfileId) {
            this.iamProfileId = options.iamProfileId;
        }
        // construct form data for the cr token use case of iam token management
        this.formData.grant_type = 'urn:ibm:params:oauth:grant-type:cr-token';
        this.userAgent = buildUserAgent('container-authenticator');
    }
    /**
     * Sets the "crTokenFilename" field
     * @param crTokenFilename - the name of the file containing the CR token
     */
    setCrTokenFilename(crTokenFilename) {
        this.crTokenFilename = crTokenFilename;
    }
    /**
     * Sets the name of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    setIamProfileName(iamProfileName) {
        this.iamProfileName = iamProfileName;
    }
    /**
     * Sets the ID of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId) {
        this.iamProfileId = iamProfileId;
    }
    /**
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    getRefreshToken() {
        return this.refreshToken;
    }
    /**
     * Request an IAM token using a compute resource token.
     */
    requestToken() {
        this.formData.cr_token = this.getCrToken();
        // these member variables can be reset, set them in the form data right
        // before making the request to ensure they're up to date
        if (this.iamProfileName) {
            this.formData.profile_name = this.iamProfileName;
        }
        if (this.iamProfileId) {
            this.formData.profile_id = this.iamProfileId;
        }
        return super.requestToken();
    }
    /**
     * Retrieves the CR token from a file using this search order:
     * 1. User-specified filename (if specified)
     * 2. Default file #1 (/var/run/secrets/tokens/vault-token)
     * 3. Default file #2 (/var/run/secrets/tokens/sa-token)
     * 4. Default file #3 (/var/run/secrets/codeengine.cloud.ibm.com/compute-resource-token/token)
     * First one found wins.
     *
     * @returns the CR token value as a string
     */
    getCrToken() {
        try {
            let crToken = null;
            if (this.crTokenFilename) {
                // If the user specified a filename, then try to read from that.
                crToken = readCrTokenFile(this.crTokenFilename);
            }
            else {
                // If no filename was specified, then try our two default filenames.
                try {
                    crToken = readCrTokenFile(DEFAULT_CR_TOKEN_FILEPATH1);
                }
                catch (err) {
                    try {
                        crToken = readCrTokenFile(DEFAULT_CR_TOKEN_FILEPATH2);
                    }
                    catch (err1) {
                        crToken = readCrTokenFile(DEFAULT_CR_TOKEN_FILEPATH3);
                    }
                }
            }
            return crToken;
        }
        catch (err) {
            throw new Error(`Error reading CR token file: ${err.toString()}`);
        }
    }
}
