import { GaxiosOptions } from 'gaxios';
/**
 * Interface defining AWS security credentials.
 * These are either determined from AWS security_credentials endpoint or
 * AWS environment variables.
 */
export interface AwsSecurityCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    token?: string;
}
/**
 * Implements an AWS API request signer based on the AWS Signature Version 4
 * signing process.
 * https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 */
export declare class AwsRequestSigner {
    private readonly getCredentials;
    private readonly region;
    private readonly crypto;
    /**
     * Instantiates an AWS API request signer used to send authenticated signed
     * requests to AWS APIs based on the AWS Signature Version 4 signing process.
     * This also provides a mechanism to generate the signed request without
     * sending it.
     * @param getCredentials A mechanism to retrieve AWS security credentials
     *   when needed.
     * @param region The AWS region to use.
     */
    constructor(getCredentials: () => Promise<AwsSecurityCredentials>, region: string);
    /**
     * Generates the signed request for the provided HTTP request for calling
     * an AWS API. This follows the steps described at:
     * https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
     * @param amzOptions The AWS request options that need to be signed.
     * @return A promise that resolves with the GaxiosOptions containing the
     *   signed HTTP request parameters.
     */
    getRequestOptions(amzOptions: GaxiosOptions): Promise<GaxiosOptions>;
}
