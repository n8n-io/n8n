import { ExternalAccountSupplierContext } from './baseexternalclient';
import { GaxiosOptions } from 'gaxios';
import { AwsSecurityCredentialsSupplier } from './awsclient';
import { AwsSecurityCredentials } from './awsrequestsigner';
/**
 * Interface defining the options used to build a {@link DefaultAwsSecurityCredentialsSupplier}.
 */
export interface DefaultAwsSecurityCredentialsSupplierOptions {
    /**
     * The URL to call to retrieve the active AWS region.
     **/
    regionUrl?: string;
    /**
     * The URL to call to retrieve AWS security credentials.
     **/
    securityCredentialsUrl?: string;
    /**
     ** The URL to call to retrieve the IMDSV2 session token.
     **/
    imdsV2SessionTokenUrl?: string;
    /**
     * Additional Gaxios options to use when making requests to the AWS metadata
     * endpoints.
     */
    additionalGaxiosOptions?: GaxiosOptions;
}
/**
 * Internal AWS security credentials supplier implementation used by {@link AwsClient}
 * when a credential source is provided instead of a user defined supplier.
 * The logic is summarized as:
 * 1. If imdsv2_session_token_url is provided in the credential source, then
 *    fetch the aws session token and include it in the headers of the
 *    metadata requests. This is a requirement for IDMSv2 but optional
 *    for IDMSv1.
 * 2. Retrieve AWS region from availability-zone.
 * 3a. Check AWS credentials in environment variables. If not found, get
 *     from security-credentials endpoint.
 * 3b. Get AWS credentials from security-credentials endpoint. In order
 *     to retrieve this, the AWS role needs to be determined by calling
 *     security-credentials endpoint without any argument. Then the
 *     credentials can be retrieved via: security-credentials/role_name
 * 4. Generate the signed request to AWS STS GetCallerIdentity action.
 * 5. Inject x-goog-cloud-target-resource into header and serialize the
 *    signed request. This will be the subject-token to pass to GCP STS.
 */
export declare class DefaultAwsSecurityCredentialsSupplier implements AwsSecurityCredentialsSupplier {
    #private;
    private readonly regionUrl?;
    private readonly securityCredentialsUrl?;
    private readonly imdsV2SessionTokenUrl?;
    private readonly additionalGaxiosOptions?;
    /**
     * Instantiates a new DefaultAwsSecurityCredentialsSupplier using information
     * from the credential_source stored in the ADC file.
     * @param opts The default aws security credentials supplier options object to
     *   build the supplier with.
     */
    constructor(opts: DefaultAwsSecurityCredentialsSupplierOptions);
    /**
     * Returns the active AWS region. This first checks to see if the region
     * is available as an environment variable. If it is not, then the supplier
     * will call the region URL.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity.
     * @return A promise that resolves with the AWS region string.
     */
    getAwsRegion(context: ExternalAccountSupplierContext): Promise<string>;
    /**
     * Returns AWS security credentials. This first checks to see if the credentials
     * is available as environment variables. If it is not, then the supplier
     * will call the security credentials URL.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity.
     * @return A promise that resolves with the AWS security credentials.
     */
    getAwsSecurityCredentials(context: ExternalAccountSupplierContext): Promise<AwsSecurityCredentials>;
}
