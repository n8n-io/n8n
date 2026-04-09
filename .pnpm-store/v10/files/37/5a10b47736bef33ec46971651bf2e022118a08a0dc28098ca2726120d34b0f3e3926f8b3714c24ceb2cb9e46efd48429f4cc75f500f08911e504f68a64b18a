import { BaseExternalAccountClient } from './baseexternalclient';
import { IdentityPoolClientOptions } from './identitypoolclient';
import { AwsClientOptions } from './awsclient';
import { PluggableAuthClientOptions } from './pluggable-auth-client';
export type ExternalAccountClientOptions = IdentityPoolClientOptions | AwsClientOptions | PluggableAuthClientOptions;
/**
 * Dummy class with no constructor. Developers are expected to use fromJSON.
 */
export declare class ExternalAccountClient {
    constructor();
    /**
     * This static method will instantiate the
     * corresponding type of external account credential depending on the
     * underlying credential source.
     *
     * **IMPORTANT**: This method does not validate the credential configuration.
     * A security risk occurs when a credential configuration configured with
     * malicious URLs is used. When the credential configuration is accepted from
     * an untrusted source, you should validate it before using it with this
     * method. For more details, see
     * https://cloud.google.com/docs/authentication/external/externally-sourced-credentials.
     *
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @return A BaseExternalAccountClient instance or null if the options
     *   provided do not correspond to an external account credential.
     */
    static fromJSON(options: ExternalAccountClientOptions): BaseExternalAccountClient | null;
}
