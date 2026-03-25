import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CopyObjectOutput, CopyObjectRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CopyObjectCommand}.
 */
export interface CopyObjectCommandInput extends CopyObjectRequest {
}
/**
 * @public
 *
 * The output of {@link CopyObjectCommand}.
 */
export interface CopyObjectCommandOutput extends CopyObjectOutput, __MetadataBearer {
}
declare const CopyObjectCommand_base: {
    new (input: CopyObjectCommandInput): import("@smithy/smithy-client").CommandImpl<CopyObjectCommandInput, CopyObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CopyObjectCommandInput): import("@smithy/smithy-client").CommandImpl<CopyObjectCommandInput, CopyObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a copy of an object that is already stored in Amazon S3.</p>
 *          <note>
 *             <p>You can store individual objects of up to 5 TB in Amazon S3. You create a copy of your
 *             object up to 5 GB in size in a single atomic action using this API. However, to copy an
 *             object greater than 5 GB, you must use the multipart upload Upload Part - Copy
 *             (UploadPartCopy) API. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/CopyingObjctsUsingRESTMPUapi.html">Copy Object Using the
 *                REST Multipart Upload API</a>.</p>
 *          </note>
 *          <p>You can copy individual objects between general purpose buckets, between directory buckets,
 *          and between general purpose buckets and directory buckets.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>Amazon S3 supports copy operations using Multi-Region Access Points only as a
 *                   destination when using the Multi-Region Access Point ARN. </p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets </b> -
 *                   For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *                <li>
 *                   <p>VPC endpoints don't support cross-Region requests (including copies). If you're
 *                   using VPC endpoints, your source and destination buckets should be in the same
 *                   Amazon Web Services Region as your VPC endpoint.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <p>Both the Region that you want to copy the object from and the Region that you want to
 *          copy the object to must be enabled for your account. For more information about how to
 *          enable a Region for your account, see <a href="https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html#manage-acct-regions-enable-standalone">Enable or disable a Region for standalone accounts</a> in the <i>Amazon Web Services
 *             Account Management Guide</i>.</p>
 *          <important>
 *             <p>Amazon S3 transfer acceleration does not support cross-Region copies. If you request a
 *             cross-Region copy using a transfer acceleration endpoint, you get a <code>400 Bad
 *                Request</code> error. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/transfer-acceleration.html">Transfer
 *             Acceleration</a>.</p>
 *          </important>
 *          <dl>
 *             <dt>Authentication and authorization</dt>
 *             <dd>
 *                <p>All <code>CopyObject</code> requests must be authenticated and signed by using
 *                   IAM credentials (access key ID and secret access key for the IAM identities).
 *                   All headers with the <code>x-amz-</code> prefix, including
 *                      <code>x-amz-copy-source</code>, must be signed. For more information, see
 *                      <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html">REST Authentication</a>.</p>
 *                <p>
 *                   <b>Directory buckets</b> - You must use the
 *                   IAM credentials to authenticate and authorize your access to the
 *                      <code>CopyObject</code> API operation, instead of using the temporary security
 *                   credentials through the <code>CreateSession</code> API operation.</p>
 *                <p>Amazon Web Services CLI or SDKs handles authentication and authorization on your
 *                   behalf.</p>
 *             </dd>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>You must have <i>read</i> access to the source object and
 *                      <i>write</i> access to the destination bucket.</p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - You
 *                         must have permissions in an IAM policy based on the source and destination
 *                         bucket types in a <code>CopyObject</code> operation.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If the source object is in a general purpose bucket, you must have
 *                                  <b>
 *                                  <code>s3:GetObject</code>
 *                               </b>
 *                               permission to read the source object that is being copied. </p>
 *                         </li>
 *                         <li>
 *                            <p>If the destination bucket is a general purpose bucket, you must have
 *                                  <b>
 *                                  <code>s3:PutObject</code>
 *                               </b>
 *                               permission to write the object copy to the destination bucket. </p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         You must have permissions in a bucket policy or an IAM identity-based policy based on the
 *                         source and destination bucket types in a <code>CopyObject</code>
 *                         operation.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If the source object that you want to copy is in a
 *                               directory bucket, you must have the <b>
 *                                  <code>s3express:CreateSession</code>
 *                               </b> permission in
 *                               the <code>Action</code> element of a policy to read the object. By
 *                               default, the session is in the <code>ReadWrite</code> mode. If you
 *                               want to restrict the access, you can explicitly set the
 *                                  <code>s3express:SessionMode</code> condition key to
 *                                  <code>ReadOnly</code> on the copy source bucket.</p>
 *                         </li>
 *                         <li>
 *                            <p>If the copy destination is a directory bucket, you must have the
 *                                  <b>
 *                                  <code>s3express:CreateSession</code>
 *                               </b> permission in the
 *                                  <code>Action</code> element of a policy to write the object to the
 *                               destination. The <code>s3express:SessionMode</code> condition key
 *                               can't be set to <code>ReadOnly</code> on the copy destination bucket.
 *                            </p>
 *                         </li>
 *                      </ul>
 *                      <p>If the object is encrypted with SSE-KMS, you must also have the
 *                            <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code> permissions
 *                         in IAM identity-based policies and KMS key policies for the KMS
 *                         key.</p>
 *                      <p>For example policies, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-example-bucket-policies.html">Example bucket policies for S3 Express One Zone</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-identity-policies.html">Amazon Web Services Identity and Access Management (IAM) identity-based policies for
 *                            S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Response and special errors</dt>
 *             <dd>
 *                <p>When the request is an HTTP 1.1 request, the response is chunk encoded. When
 *                   the request is not an HTTP 1.1 request, the response would not contain the
 *                      <code>Content-Length</code>. You always need to read the entire response body
 *                   to check if the copy succeeds. </p>
 *                <ul>
 *                   <li>
 *                      <p>If the copy is successful, you receive a response with information about
 *                         the copied object.</p>
 *                   </li>
 *                   <li>
 *                      <p>A copy request might return an error when Amazon S3 receives the copy request
 *                         or while Amazon S3 is copying the files. A <code>200 OK</code> response can
 *                         contain either a success or an error.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If the error occurs before the copy action starts, you receive a
 *                               standard Amazon S3 error.</p>
 *                         </li>
 *                         <li>
 *                            <p>If the error occurs during the copy operation, the error response
 *                               is embedded in the <code>200 OK</code> response. For example, in a
 *                               cross-region copy, you may encounter throttling and receive a
 *                                  <code>200 OK</code> response. For more information, see <a href="https://repost.aws/knowledge-center/s3-resolve-200-internalerror">Resolve the Error 200 response when copying objects to
 *                                  Amazon S3</a>. The <code>200 OK</code> status code means the copy
 *                               was accepted, but it doesn't mean the copy is complete. Another
 *                               example is when you disconnect from Amazon S3 before the copy is complete,
 *                               Amazon S3 might cancel the copy and you may receive a <code>200 OK</code>
 *                               response. You must stay connected to Amazon S3 until the entire response is
 *                               successfully received and processed.</p>
 *                            <p>If you call this API operation directly, make sure to design your
 *                               application to parse the content of the response and handle it
 *                               appropriately. If you use Amazon Web Services SDKs, SDKs handle this condition. The
 *                               SDKs detect the embedded error and apply error handling per your
 *                               configuration settings (including automatically retrying the request
 *                               as appropriate). If the condition persists, the SDKs throw an
 *                               exception (or, for the SDKs that don't use exceptions, they return an
 *                               error).</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Charge</dt>
 *             <dd>
 *                <p>The copy request charge is based on the storage class and Region that you
 *                   specify for the destination object. The request can also result in a data
 *                   retrieval charge for the source if the source storage class bills for data
 *                   retrieval. If the copy source is in a different region, the data transfer is
 *                   billed to the copy source account. For pricing information, see <a href="http://aws.amazon.com/s3/pricing/">Amazon S3 pricing</a>.</p>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                            <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Amazon S3 on Outposts</b> - When you use this action with S3 on Outposts through the REST API, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
 *                      form <code>
 *                            <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. The hostname isn't required when you use the Amazon Web Services CLI or SDKs.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>CopyObject</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html">PutObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, CopyObjectCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // CopyObjectRequest
 *   ACL: "private" || "public-read" || "public-read-write" || "authenticated-read" || "aws-exec-read" || "bucket-owner-read" || "bucket-owner-full-control",
 *   Bucket: "STRING_VALUE", // required
 *   CacheControl: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ContentDisposition: "STRING_VALUE",
 *   ContentEncoding: "STRING_VALUE",
 *   ContentLanguage: "STRING_VALUE",
 *   ContentType: "STRING_VALUE",
 *   CopySource: "STRING_VALUE", // required
 *   CopySourceIfMatch: "STRING_VALUE",
 *   CopySourceIfModifiedSince: new Date("TIMESTAMP"),
 *   CopySourceIfNoneMatch: "STRING_VALUE",
 *   CopySourceIfUnmodifiedSince: new Date("TIMESTAMP"),
 *   Expires: new Date("TIMESTAMP"),
 *   GrantFullControl: "STRING_VALUE",
 *   GrantRead: "STRING_VALUE",
 *   GrantReadACP: "STRING_VALUE",
 *   GrantWriteACP: "STRING_VALUE",
 *   Key: "STRING_VALUE", // required
 *   Metadata: { // Metadata
 *     "<keys>": "STRING_VALUE",
 *   },
 *   MetadataDirective: "COPY" || "REPLACE",
 *   TaggingDirective: "COPY" || "REPLACE",
 *   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 *   StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 *   WebsiteRedirectLocation: "STRING_VALUE",
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   SSEKMSKeyId: "STRING_VALUE",
 *   SSEKMSEncryptionContext: "STRING_VALUE",
 *   BucketKeyEnabled: true || false,
 *   CopySourceSSECustomerAlgorithm: "STRING_VALUE",
 *   CopySourceSSECustomerKey: "STRING_VALUE",
 *   CopySourceSSECustomerKeyMD5: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   Tagging: "STRING_VALUE",
 *   ObjectLockMode: "GOVERNANCE" || "COMPLIANCE",
 *   ObjectLockRetainUntilDate: new Date("TIMESTAMP"),
 *   ObjectLockLegalHoldStatus: "ON" || "OFF",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ExpectedSourceBucketOwner: "STRING_VALUE",
 * };
 * const command = new CopyObjectCommand(input);
 * const response = await client.send(command);
 * // { // CopyObjectOutput
 * //   CopyObjectResult: { // CopyObjectResult
 * //     ETag: "STRING_VALUE",
 * //     LastModified: new Date("TIMESTAMP"),
 * //     ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //     ChecksumCRC32: "STRING_VALUE",
 * //     ChecksumCRC32C: "STRING_VALUE",
 * //     ChecksumCRC64NVME: "STRING_VALUE",
 * //     ChecksumSHA1: "STRING_VALUE",
 * //     ChecksumSHA256: "STRING_VALUE",
 * //   },
 * //   Expiration: "STRING_VALUE",
 * //   CopySourceVersionId: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   SSECustomerAlgorithm: "STRING_VALUE",
 * //   SSECustomerKeyMD5: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   SSEKMSEncryptionContext: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param CopyObjectCommandInput - {@link CopyObjectCommandInput}
 * @returns {@link CopyObjectCommandOutput}
 * @see {@link CopyObjectCommandInput} for command's `input` shape.
 * @see {@link CopyObjectCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link ObjectNotInActiveTierError} (client fault)
 *  <p>The source object of the COPY action is not in the active tier and is only stored in
 *          Amazon S3 Glacier.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To copy an object
 * ```javascript
 * // The following example copies an object from one bucket to another.
 * const input = {
 *   Bucket: "destinationbucket",
 *   CopySource: "/sourcebucket/HappyFacejpg",
 *   Key: "HappyFaceCopyjpg"
 * };
 * const command = new CopyObjectCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   CopyObjectResult: {
 *     ETag: `"6805f2cfc46c0f04559748bb039d69ae"`,
 *     LastModified: "2016-12-15T17:38:53.000Z"
 *   }
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CopyObjectCommand extends CopyObjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CopyObjectRequest;
            output: CopyObjectOutput;
        };
        sdk: {
            input: CopyObjectCommandInput;
            output: CopyObjectCommandOutput;
        };
    };
}
