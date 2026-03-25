import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketEncryptionRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketEncryptionCommand}.
 */
export interface PutBucketEncryptionCommandInput extends PutBucketEncryptionRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketEncryptionCommand}.
 */
export interface PutBucketEncryptionCommandOutput extends __MetadataBearer {
}
declare const PutBucketEncryptionCommand_base: {
    new (input: PutBucketEncryptionCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketEncryptionCommandInput, PutBucketEncryptionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketEncryptionCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketEncryptionCommandInput, PutBucketEncryptionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>This operation configures default encryption and Amazon S3 Bucket Keys for an existing
 *          bucket.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets </b> - For directory buckets, you must make requests for this API operation to the Regional endpoint. These endpoints support path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
 *                </code>. Virtual-hosted-style requests aren't supported.
 * For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <p>By default, all buckets have a default encryption configuration that uses server-side
 *          encryption with Amazon S3 managed keys (SSE-S3).</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose buckets</b>
 *                   </p>
 *                   <ul>
 *                      <li>
 *                         <p>You can optionally configure default encryption for a bucket by using
 *                         server-side encryption with Key Management Service (KMS) keys (SSE-KMS) or dual-layer
 *                         server-side encryption with Amazon Web Services KMS keys (DSSE-KMS). If you specify
 *                         default encryption by using SSE-KMS, you can also configure <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-key.html">Amazon S3
 *                            Bucket Keys</a>. For information about the bucket default encryption
 *                         feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html">Amazon S3 Bucket Default
 *                            Encryption</a> in the <i>Amazon S3 User Guide</i>. </p>
 *                      </li>
 *                      <li>
 *                         <p>If you use PutBucketEncryption to set your <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html">default bucket
 *                            encryption</a> to SSE-KMS, you should verify that your KMS key ID
 *                         is correct. Amazon S3 doesn't validate the KMS key ID provided in
 *                         PutBucketEncryption requests.</p>
 *                      </li>
 *                   </ul>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets </b> - You can
 *                   optionally configure default encryption for a bucket by using server-side
 *                   encryption with Key Management Service (KMS) keys (SSE-KMS).</p>
 *                   <ul>
 *                      <li>
 *                         <p>We recommend that the bucket's default encryption uses the desired
 *                         encryption configuration and you don't override the bucket default
 *                         encryption in your <code>CreateSession</code> requests or <code>PUT</code>
 *                         object requests. Then, new objects are automatically encrypted with the
 *                         desired encryption settings.
 *                         For more information about the encryption overriding behaviors in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-specifying-kms-encryption.html">Specifying server-side encryption with KMS for new object uploads</a>.</p>
 *                      </li>
 *                      <li>
 *                         <p>Your SSE-KMS configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per directory bucket's lifetime.
 * The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
 * </p>
 *                      </li>
 *                      <li>
 *                         <p>S3 Bucket Keys are always enabled for <code>GET</code> and <code>PUT</code> operations in a directory bucket and can’t be disabled. S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
 * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-Batch-Ops">the Copy operation in Batch Operations</a>, or
 *                             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-import-job">the import jobs</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
 *                      </li>
 *                      <li>
 *                         <p>When you specify an <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">KMS customer managed key</a> for encryption in your directory bucket, only use the key ID or key ARN. The key alias format of the KMS key isn't supported.</p>
 *                      </li>
 *                      <li>
 *                         <p>For directory buckets, if you use PutBucketEncryption to set your <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html">default bucket encryption</a> to SSE-KMS, Amazon S3 validates the
 *                         KMS key ID provided in PutBucketEncryption requests.</p>
 *                      </li>
 *                   </ul>
 *                </li>
 *             </ul>
 *          </note>
 *          <important>
 *             <p>If you're specifying a customer managed KMS key, we recommend using a fully
 *             qualified KMS key ARN. If you use a KMS key alias instead, then KMS resolves the
 *             key within the requester’s account. This behavior can result in data that's encrypted
 *             with a KMS key that belongs to the requester, and not the bucket owner.</p>
 *             <p>Also, this action requires Amazon Web Services Signature Version 4. For more information, see
 *                <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html"> Authenticating
 *                Requests (Amazon Web Services Signature Version 4)</a>. </p>
 *          </important>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - The
 *                            <code>s3:PutEncryptionConfiguration</code> permission is required in a
 *                         policy. The bucket owner has this permission by default. The bucket owner
 *                         can grant this permission to others. For more information about permissions,
 *                         see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing Access
 *                            Permissions to Your Amazon S3 Resources</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         To grant access to this API operation, you must have the
 *                            <code>s3express:PutEncryptionConfiguration</code> permission in
 *                         an IAM identity-based policy instead of a bucket policy. Cross-account access to this API operation isn't supported. This operation can only be performed by the Amazon Web Services account that owns the resource.
 *                         For more information about directory bucket policies and permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Amazon Web Services Identity and Access Management (IAM) for S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                      <p>To set a directory bucket default encryption with SSE-KMS, you must also
 *                         have the <code>kms:GenerateDataKey</code> and the <code>kms:Decrypt</code>
 *                         permissions in IAM identity-based policies and KMS key policies for the
 *                         target KMS key.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>s3express-control.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>PutBucketEncryption</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketEncryption.html">GetBucketEncryption</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketEncryption.html">DeleteBucketEncryption</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketEncryptionCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketEncryptionCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketEncryptionRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ServerSideEncryptionConfiguration: { // ServerSideEncryptionConfiguration
 *     Rules: [ // ServerSideEncryptionRules // required
 *       { // ServerSideEncryptionRule
 *         ApplyServerSideEncryptionByDefault: { // ServerSideEncryptionByDefault
 *           SSEAlgorithm: "AES256" || "aws:kms" || "aws:kms:dsse", // required
 *           KMSMasterKeyID: "STRING_VALUE",
 *         },
 *         BucketKeyEnabled: true || false,
 *       },
 *     ],
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketEncryptionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketEncryptionCommandInput - {@link PutBucketEncryptionCommandInput}
 * @returns {@link PutBucketEncryptionCommandOutput}
 * @see {@link PutBucketEncryptionCommandInput} for command's `input` shape.
 * @see {@link PutBucketEncryptionCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutBucketEncryptionCommand extends PutBucketEncryptionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketEncryptionRequest;
            output: {};
        };
        sdk: {
            input: PutBucketEncryptionCommandInput;
            output: PutBucketEncryptionCommandOutput;
        };
    };
}
