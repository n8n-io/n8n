import { AwsSecurityCredentials } from './awsrequestsigner';
import { BaseExternalAccountClient, BaseExternalAccountClientOptions, ExternalAccountSupplierContext } from './baseexternalclient';
import { AuthClientOptions } from './authclient';
import { SnakeToCamelObject } from '../util';
/**
 * AWS credentials JSON interface. This is used for AWS workloads.
 */
export interface AwsClientOptions extends BaseExternalAccountClientOptions {
    /**
     * Object containing options to retrieve AWS security credentials. A valid credential
     * source or a aws security credentials supplier should be specified.
     */
    credential_source?: {
        /**
         * AWS environment ID. Currently only 'AWS1' is supported.
         */
        environment_id: string;
        /**
         * The EC2 metadata URL to retrieve the current AWS region from. If this is
         * not provided, the region should be present in the AWS_REGION or AWS_DEFAULT_REGION
         * environment variables.
         */
        region_url?: string;
        /**
         * The EC2 metadata URL to retrieve AWS security credentials. If this is not provided,
         * the credentials should be present in the AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
         * and AWS_SESSION_TOKEN environment variables.
         */
        url?: string;
        /**
         * The regional GetCallerIdentity action URL, used to determine the account
         * ID and its roles.
         */
        regional_cred_verification_url: string;
        /**
         *  The imdsv2 session token url is used to fetch session token from AWS
         *  which is later sent through headers for metadata requests. If the
         *  field is missing, then session token won't be fetched and sent with
         *  the metadata requests.
         *  The session token is required for IMDSv2 but optional for IMDSv1
         */
        imdsv2_session_token_url?: string;
    };
    /**
     * The AWS security credentials supplier to call to retrieve the AWS region
     * and AWS security credentials. Either this or a valid credential source
     * must be specified.
     */
    aws_security_credentials_supplier?: AwsSecurityCredentialsSupplier;
}
/**
 * Supplier interface for AWS security credentials. This can be implemented to
 * return an AWS region and AWS security credentials. These credentials can
 * then be exchanged for a GCP token by an {@link AwsClient}.
 */
export interface AwsSecurityCredentialsSupplier {
    /**
     * Gets the active AWS region.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity as well as the transport from the
     *   calling client to use for requests.
     * @return A promise that resolves with the AWS region string.
     */
    getAwsRegion: (context: ExternalAccountSupplierContext) => Promise<string>;
    /**
     * Gets valid AWS security credentials for the requested external account
     * identity. Note that these are not cached by the calling {@link AwsClient},
     * so caching should be including in the implementation.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity as well as the transport from the
     *   calling client to use for requests.
     * @return A promise that resolves with the requested {@link AwsSecurityCredentials}.
     */
    getAwsSecurityCredentials: (context: ExternalAccountSupplierContext) => Promise<AwsSecurityCredentials>;
}
/**
 * AWS external account client. This is used for AWS workloads, where
 * AWS STS GetCallerIdentity serialized signed requests are exchanged for
 * GCP access token.
 */
export declare class AwsClient extends BaseExternalAccountClient {
    #private;
    private readonly environmentId?;
    private readonly awsSecurityCredentialsSupplier;
    private readonly regionalCredVerificationUrl;
    private awsRequestSigner;
    private region;
    /**
     * @deprecated AWS client no validates the EC2 metadata address.
     **/
    static AWS_EC2_METADATA_IPV4_ADDRESS: string;
    /**
     * @deprecated AWS client no validates the EC2 metadata address.
     **/
    static AWS_EC2_METADATA_IPV6_ADDRESS: string;
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
    constructor(options: AwsClientOptions | SnakeToCamelObject<AwsClientOptions>, additionalOptions?: AuthClientOptions);
    private validateEnvironmentId;
    /**
     * Triggered when an external subject token is needed to be exchanged for a
     * GCP access token via GCP STS endpoint. This will call the
     * {@link AwsSecurityCredentialsSupplier} to retrieve an AWS region and AWS
     * Security Credentials, then use them to create a signed AWS STS request that
     * can be exchanged for a GCP access token.
     * @return A promise that resolves with the external subject token.
     */
    retrieveSubjectToken(): Promise<string>;
}
