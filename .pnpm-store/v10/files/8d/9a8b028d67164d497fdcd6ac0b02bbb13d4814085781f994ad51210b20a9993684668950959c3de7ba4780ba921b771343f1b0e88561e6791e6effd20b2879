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
/** A tenant remote credential store. */
export interface RemoteCredentialStore {
    /** The IBM cloud secrets manager remote tenant credential store. */
    ibm_cloud_secret_manager?: RemoteCredentialStoreIBMCloudSecretManager;
}
/** The IBM cloud secrets manager remote tenant credential store. */
export interface RemoteCredentialStoreIBMCloudSecretManager {
    /** The base URL of the IBM Cloud Secrets Manager. */
    base_url?: string;
    /** The access group to use in the IBM Secrets Manager. */
    group?: string;
}
/** Information about a tenancy. */
export interface Tenant {
    /** The unique identifier of the tenant. */
    id: string;
    /** Name of the tenant. */
    name: string;
    /** A tenant remote credential store. */
    remote_credential_store?: RemoteCredentialStore;
}
//# sourceMappingURL=response.d.mts.map