/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
/** Parameters for encryption configuration. */
export interface EncryptionParams {
    /** Encryption configuration for sensitive data */
    crypto?: Crypto;
}
/** Encryption configuration for securing inference requests. */
export interface Crypto {
    /**
     * Identifier of the DEK (Data Encryption Key) in the chosen keys management service.
     *
     * The format depends on the keys management service:
     *
     * - **IBM Key Protect**: Full CRN format
     *
     *   - Example:
     *       `crn:v1:bluemix:public:kms:us-south:a/12345:<instance_id>:key:<root_key_id>:wdek:<ciphertext>`
     *
     * This field is required, but its exact format depends on the selected keys manager. No strict
     * pattern is enforced here - validation will be performed by the keys management service.
     *
     * @example
     *   'crn:v1:bluemix:public:kms:us-south:a/12345:abcd1234-56ef-78gh-90ij-klmnopqrstuv:key:abcd1234-56ef-78gh-90ij-klmnopqrstuv:wdek:ed3131de23434';
     */
    key_ref: string;
}
//# sourceMappingURL=encryption.d.mts.map