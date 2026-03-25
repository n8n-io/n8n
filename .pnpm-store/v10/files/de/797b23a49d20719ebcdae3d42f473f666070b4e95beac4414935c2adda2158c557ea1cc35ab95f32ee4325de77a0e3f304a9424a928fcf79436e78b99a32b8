import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateSessionOutput, CreateSessionRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateSessionCommand}.
 */
export interface CreateSessionCommandInput extends CreateSessionRequest {
}
/**
 * @public
 *
 * The output of {@link CreateSessionCommand}.
 */
export interface CreateSessionCommandOutput extends CreateSessionOutput, __MetadataBearer {
}
declare const CreateSessionCommand_base: {
    new (input: CreateSessionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateSessionCommandInput, CreateSessionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateSessionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateSessionCommandInput, CreateSessionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a session that establishes temporary security credentials to support fast
 *          authentication and authorization for the Zonal endpoint API operations on directory buckets. For more
 *          information about Zonal endpoint API operations that include the Availability Zone in the request endpoint, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-APIs.html">S3 Express One Zone
 *             APIs</a> in the <i>Amazon S3 User Guide</i>. </p>
 *          <p>To make Zonal endpoint API requests on a directory bucket, use the <code>CreateSession</code>
 *          API operation. Specifically, you grant <code>s3express:CreateSession</code> permission to a
 *          bucket in a bucket policy or an IAM identity-based policy. Then, you use IAM credentials to make the
 *             <code>CreateSession</code> API request on the bucket, which returns temporary security
 *          credentials that include the access key ID, secret access key, session token, and
 *          expiration. These credentials have associated permissions to access the Zonal endpoint API operations. After
 *          the session is created, you don’t need to use other policies to grant permissions to each
 *          Zonal endpoint API individually. Instead, in your Zonal endpoint API requests, you sign your requests by
 *          applying the temporary security credentials of the session to the request headers and
 *          following the SigV4 protocol for authentication. You also apply the session token to the
 *             <code>x-amz-s3session-token</code> request header for authorization. Temporary security
 *          credentials are scoped to the bucket and expire after 5 minutes. After the expiration time,
 *          any calls that you make with those credentials will fail. You must use IAM credentials
 *          again to make a <code>CreateSession</code> API request that generates a new set of
 *          temporary credentials for use. Temporary credentials cannot be extended or refreshed beyond
 *          the original specified interval.</p>
 *          <p>If you use Amazon Web Services SDKs, SDKs handle the session token refreshes automatically to avoid
 *          service interruptions when a session expires. We recommend that you use the Amazon Web Services SDKs to
 *          initiate and manage requests to the CreateSession API. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-optimizing-performance-guidelines-design-patterns.html#s3-express-optimizing-performance-session-authentication">Performance guidelines and design patterns</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>You must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>
 *                         <code>CopyObject</code> API operation</b> -
 *                   Unlike other Zonal endpoint API operations, the <code>CopyObject</code> API operation doesn't use
 *                   the temporary security credentials returned from the <code>CreateSession</code>
 *                   API operation for authentication and authorization. For information about
 *                   authentication and authorization of the <code>CopyObject</code> API operation on
 *                   directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>
 *                         <code>HeadBucket</code> API operation</b> -
 *                   Unlike other Zonal endpoint API operations, the <code>HeadBucket</code> API operation doesn't use
 *                   the temporary security credentials returned from the <code>CreateSession</code>
 *                   API operation for authentication and authorization. For information about
 *                   authentication and authorization of the <code>HeadBucket</code> API operation on
 *                   directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html">HeadBucket</a>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>To obtain temporary security credentials, you must create
 *                   a bucket policy or an IAM identity-based policy that grants <code>s3express:CreateSession</code>
 *                   permission to the bucket. In a policy, you can have the
 *                      <code>s3express:SessionMode</code> condition key to control who can create a
 *                      <code>ReadWrite</code> or <code>ReadOnly</code> session. For more information
 *                   about <code>ReadWrite</code> or <code>ReadOnly</code> sessions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html#API_CreateSession_RequestParameters">
 *                      <code>x-amz-create-session-mode</code>
 *                   </a>. For example policies, see
 *                      <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-example-bucket-policies.html">Example bucket policies for S3 Express One Zone</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-identity-policies.html">Amazon Web Services Identity and Access Management (IAM) identity-based policies for
 *                      S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>. </p>
 *                <p>To grant cross-account access to Zonal endpoint API operations, the bucket policy should also
 *                   grant both accounts the <code>s3express:CreateSession</code> permission.</p>
 *                <p>If you want to encrypt objects with SSE-KMS, you must also have the
 *                      <code>kms:GenerateDataKey</code> and the <code>kms:Decrypt</code> permissions
 *                   in IAM identity-based policies and KMS key policies for the target KMS
 *                   key.</p>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <p>For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). We recommend that the bucket's default encryption uses the desired encryption configuration and you don't override the bucket default encryption in your
 *             <code>CreateSession</code> requests or <code>PUT</code> object requests. Then, new objects
 *  are automatically encrypted with the desired encryption settings. For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>. For more information about the encryption overriding behaviors in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-specifying-kms-encryption.html">Specifying server-side encryption with KMS for new object uploads</a>.</p>
 *                <p>For <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-differences.html#s3-express-differences-api-operations">Zonal endpoint (object-level) API operations</a> except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>,
 * you authenticate and authorize requests through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">CreateSession</a> for low latency.
 *                             To encrypt new objects in a directory bucket with SSE-KMS, you must specify SSE-KMS as the directory bucket's default encryption configuration with a KMS key (specifically, a <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a>). Then, when a session is created for Zonal endpoint API operations, new objects are automatically encrypted and decrypted with SSE-KMS and S3 Bucket Keys during the session.</p>
 *                <note>
 *                   <p>
 *                             Only 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> is supported per directory bucket for the lifetime of the bucket. The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
 *                             After you specify SSE-KMS as your bucket's default encryption configuration with a customer managed key, you can't change the customer managed key for the bucket's SSE-KMS configuration.
 *                             </p>
 *                </note>
 *                <p>In the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>) using the REST API,
 *                             you can't override the values of the encryption settings (<code>x-amz-server-side-encryption</code>, <code>x-amz-server-side-encryption-aws-kms-key-id</code>, <code>x-amz-server-side-encryption-context</code>, and <code>x-amz-server-side-encryption-bucket-key-enabled</code>) from the <code>CreateSession</code> request.
 *                             You don't need to explicitly specify these encryption settings values in Zonal endpoint API calls, and
 *                             Amazon S3 will use the encryption settings values from the <code>CreateSession</code> request to protect new objects in the directory bucket.
 *                            </p>
 *                <note>
 *                   <p>When you use the CLI or the Amazon Web Services SDKs, for <code>CreateSession</code>, the session token refreshes automatically to avoid service interruptions when a session expires. The CLI or the Amazon Web Services SDKs use the bucket's default encryption configuration for the
 *                             <code>CreateSession</code> request. It's not supported to override the encryption settings values in the <code>CreateSession</code> request.
 *                             Also, in the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>),
 *           it's not supported to override the values of the encryption settings from the <code>CreateSession</code> request.
 *
 * </p>
 *                </note>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, CreateSessionCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, CreateSessionCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // CreateSessionRequest
 *   SessionMode: "ReadOnly" || "ReadWrite",
 *   Bucket: "STRING_VALUE", // required
 *   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 *   SSEKMSKeyId: "STRING_VALUE",
 *   SSEKMSEncryptionContext: "STRING_VALUE",
 *   BucketKeyEnabled: true || false,
 * };
 * const command = new CreateSessionCommand(input);
 * const response = await client.send(command);
 * // { // CreateSessionOutput
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   SSEKMSEncryptionContext: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   Credentials: { // SessionCredentials
 * //     AccessKeyId: "STRING_VALUE", // required
 * //     SecretAccessKey: "STRING_VALUE", // required
 * //     SessionToken: "STRING_VALUE", // required
 * //     Expiration: new Date("TIMESTAMP"), // required
 * //   },
 * // };
 *
 * ```
 *
 * @param CreateSessionCommandInput - {@link CreateSessionCommandInput}
 * @returns {@link CreateSessionCommandOutput}
 * @see {@link CreateSessionCommandInput} for command's `input` shape.
 * @see {@link CreateSessionCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchBucket} (client fault)
 *  <p>The specified bucket does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class CreateSessionCommand extends CreateSessionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateSessionRequest;
            output: CreateSessionOutput;
        };
        sdk: {
            input: CreateSessionCommandInput;
            output: CreateSessionCommandOutput;
        };
    };
}
