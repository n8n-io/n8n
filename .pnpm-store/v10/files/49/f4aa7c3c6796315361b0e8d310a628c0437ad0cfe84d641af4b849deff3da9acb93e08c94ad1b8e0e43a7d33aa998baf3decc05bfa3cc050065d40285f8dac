import { BaseExternalAccountClient, BaseExternalAccountClientOptions, ExternalAccountSupplierContext } from './baseexternalclient';
import { SnakeToCamelObject } from '../util';
export type SubjectTokenFormatType = 'json' | 'text';
export interface SubjectTokenJsonResponse {
    [key: string]: string;
}
/**
 * Supplier interface for subject tokens. This can be implemented to
 * return a subject token which can then be exchanged for a GCP token by an
 * {@link IdentityPoolClient}.
 */
export interface SubjectTokenSupplier {
    /**
     * Gets a valid subject token for the requested external account identity.
     * Note that these are not cached by the calling {@link IdentityPoolClient},
     * so caching should be including in the implementation.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link IdentityPoolClient}, contains the requested audience and subject token type
     *   for the external account identity as well as the transport from the
     *   calling client to use for requests.
     * @return A promise that resolves with the requested subject token string.
     */
    getSubjectToken: (context: ExternalAccountSupplierContext) => Promise<string>;
}
/**
 * Url-sourced/file-sourced credentials json interface.
 * This is used for K8s and Azure workloads.
 */
export interface IdentityPoolClientOptions extends BaseExternalAccountClientOptions {
    /**
     * Object containing options to retrieve identity pool credentials. A valid credential
     * source or a subject token supplier must be specified.
     */
    credential_source?: {
        /**
         * The file location to read the subject token from. Either this or a URL
         * should be specified.
         */
        file?: string;
        /**
         * The URL to call to retrieve the subject token. Either this or a file
         * location should be specified.
         */
        url?: string;
        /**
         * Optional headers to send on the request to the specified URL.
         */
        headers?: {
            [key: string]: string;
        };
        /**
         * The format that the subject token is in the file or the URL response.
         * If not provided, will default to reading the text string directly.
         */
        format?: {
            /**
             * The format type. Can either be 'text' or 'json'.
             */
            type: SubjectTokenFormatType;
            /**
             * The field name containing the subject token value if the type is 'json'.
             */
            subject_token_field_name?: string;
        };
    };
    /**
     * The subject token supplier to call to retrieve the subject token to exchange
     * for a GCP access token. Either this or a valid credential source should
     * be specified.
     */
    subject_token_supplier?: SubjectTokenSupplier;
}
/**
 * Defines the Url-sourced and file-sourced external account clients mainly
 * used for K8s and Azure workloads.
 */
export declare class IdentityPoolClient extends BaseExternalAccountClient {
    private readonly subjectTokenSupplier;
    /**
     * Instantiate an IdentityPoolClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid file-sourced or
     * url-sourced credential or a workforce pool user project is provided
     * with a non workforce audience.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file. The camelCased options
     *   are aliases for the snake_cased options.
     */
    constructor(options: IdentityPoolClientOptions | SnakeToCamelObject<IdentityPoolClientOptions>);
    /**
     * Triggered when a external subject token is needed to be exchanged for a GCP
     * access token via GCP STS endpoint. Gets a subject token by calling
     * the configured {@link SubjectTokenSupplier}
     * @return A promise that resolves with the external subject token.
     */
    retrieveSubjectToken(): Promise<string>;
}
