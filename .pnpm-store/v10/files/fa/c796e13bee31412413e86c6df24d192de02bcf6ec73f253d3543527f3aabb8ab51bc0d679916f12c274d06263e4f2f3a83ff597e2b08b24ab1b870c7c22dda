/**
 * (C) Copyright IBM Corp. 2019, 2024.
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
import { JwtTokenManager, JwtTokenManagerOptions } from './jwt-token-manager';
/** Configuration options for CP4D token retrieval. */
interface Options extends JwtTokenManagerOptions {
    /** The endpoint for CP4D token requests. */
    url: string;
    /** The username used to obtain a bearer token. */
    username: string;
    /** The password used to obtain a bearer token [required if apikey not specified]. */
    password?: string;
    /** The API key used to obtain a bearer token [required if password not specified]. */
    apikey?: string;
}
export interface CpdTokenData {
    username: string;
    role: string;
    permissions: string[];
    sub: string;
    iss: string;
    aud: string;
    uid: string;
    _messageCode_: string;
    message: string;
    accessToken: string;
}
/**
 * Token Manager of CloudPak for data.
 *
 * The Token Manager performs basic auth with a username and password
 * to acquire CP4D tokens.
 */
export declare class Cp4dTokenManager extends JwtTokenManager {
    protected requiredOptions: string[];
    private username;
    private password;
    private apikey;
    /**
     * Create a new Cp4dTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - username: (required) the username used to obtain a bearer token
     * - password: (optional) the password used to obtain a bearer token (required if apikey is not specified)
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    constructor(options: Options);
    protected requestToken(): Promise<any>;
}
export {};
