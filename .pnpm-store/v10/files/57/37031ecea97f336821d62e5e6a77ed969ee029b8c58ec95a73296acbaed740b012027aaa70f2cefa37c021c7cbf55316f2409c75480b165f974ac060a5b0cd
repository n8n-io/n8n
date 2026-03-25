import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketEncryptionOutput, GetBucketEncryptionRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketEncryptionCommand}.
 */
export interface GetBucketEncryptionCommandInput extends GetBucketEncryptionRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketEncryptionCommand}.
 */
export interface GetBucketEncryptionCommandOutput extends GetBucketEncryptionOutput, __MetadataBearer {
}
declare const GetBucketEncryptionCommand_base: {
    new (input: GetBucketEncryptionCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketEncryptionCommandInput, GetBucketEncryptionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketEncryptionCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketEncryptionCommandInput, GetBucketEncryptionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns the default encryption configuration for an Amazon S3 bucket. By default, all buckets
 *          have a default encryption configuration that uses server-side encryption with Amazon S3 managed
 *          keys (SSE-S3). </p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose buckets</b> - For information
 *                   about the bucket default encryption feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html">Amazon S3 Bucket Default
 *                      Encryption</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   For directory buckets, there are only two supported options for server-side encryption: SSE-S3 and SSE-KMS. For information about the default encryption
 *                   configuration in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-bucket-encryption.html">Setting
 *                      default server-side encryption behavior for directory buckets</a>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - The
 *                            <code>s3:GetEncryptionConfiguration</code> permission is required in a
 *                         policy. The bucket owner has this permission by default. The bucket owner
 *                         can grant this permission to others. For more information about permissions,
 *                         see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing Access
 *                            Permissions to Your Amazon S3 Resources</a>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         To grant access to this API operation, you must have the
 *                            <code>s3express:GetEncryptionConfiguration</code> permission in
 *                         an IAM identity-based policy instead of a bucket policy. Cross-account access to this API operation isn't supported. This operation can only be performed by the Amazon Web Services account that owns the resource.
 *                         For more information about directory bucket policies and permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Amazon Web Services Identity and Access Management (IAM) for S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>s3express-control.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>GetBucketEncryption</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketEncryption.html">PutBucketEncryption</a>
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
 * import { S3Client, GetBucketEncryptionCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketEncryptionCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketEncryptionRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketEncryptionCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketEncryptionOutput
 * //   ServerSideEncryptionConfiguration: { // ServerSideEncryptionConfiguration
 * //     Rules: [ // ServerSideEncryptionRules // required
 * //       { // ServerSideEncryptionRule
 * //         ApplyServerSideEncryptionByDefault: { // ServerSideEncryptionByDefault
 * //           SSEAlgorithm: "AES256" || "aws:kms" || "aws:kms:dsse", // required
 * //           KMSMasterKeyID: "STRING_VALUE",
 * //         },
 * //         BucketKeyEnabled: true || false,
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBucketEncryptionCommandInput - {@link GetBucketEncryptionCommandInput}
 * @returns {@link GetBucketEncryptionCommandOutput}
 * @see {@link GetBucketEncryptionCommandInput} for command's `input` shape.
 * @see {@link GetBucketEncryptionCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketEncryptionCommand extends GetBucketEncryptionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketEncryptionRequest;
            output: GetBucketEncryptionOutput;
        };
        sdk: {
            input: GetBucketEncryptionCommandInput;
            output: GetBucketEncryptionCommandOutput;
        };
    };
}
