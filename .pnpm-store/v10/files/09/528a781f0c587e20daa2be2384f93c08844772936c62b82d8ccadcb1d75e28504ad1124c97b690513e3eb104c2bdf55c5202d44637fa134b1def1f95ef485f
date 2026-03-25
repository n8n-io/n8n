import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketPolicyRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketPolicyCommand}.
 */
export interface DeleteBucketPolicyCommandInput extends DeleteBucketPolicyRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketPolicyCommand}.
 */
export interface DeleteBucketPolicyCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketPolicyCommand_base: {
    new (input: DeleteBucketPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketPolicyCommandInput, DeleteBucketPolicyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketPolicyCommandInput, DeleteBucketPolicyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the policy of a specified bucket.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets </b> - For directory buckets, you must make requests for this API operation to the Regional endpoint. These endpoints support path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
 *                </code>. Virtual-hosted-style requests aren't supported.
 * For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>If you are using an identity other than the root user of the Amazon Web Services account that
 *                   owns the bucket, the calling identity must both have the
 *                      <code>DeleteBucketPolicy</code> permissions on the specified bucket and belong
 *                   to the bucket owner's account in order to use this operation.</p>
 *                <p>If you don't have <code>DeleteBucketPolicy</code> permissions, Amazon S3 returns a
 *                      <code>403 Access Denied</code> error. If you have the correct permissions, but
 *                   you're not using an identity that belongs to the bucket owner's account, Amazon S3
 *                   returns a <code>405 Method Not Allowed</code> error.</p>
 *                <important>
 *                   <p>To ensure that bucket owners don't inadvertently lock themselves out of
 *                      their own buckets, the root principal in a bucket owner's Amazon Web Services account can
 *                      perform the <code>GetBucketPolicy</code>, <code>PutBucketPolicy</code>, and
 *                         <code>DeleteBucketPolicy</code> API actions, even if their bucket policy
 *                      explicitly denies the root principal's access. Bucket owner root principals can
 *                      only be blocked from performing these API actions by VPC endpoint policies and
 *                      Amazon Web Services Organizations policies.</p>
 *                </important>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - The
 *                            <code>s3:DeleteBucketPolicy</code> permission is required in a policy.
 *                         For more information about general purpose buckets bucket policies, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html">Using Bucket Policies and User Policies</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         To grant access to this API operation, you must have the
 *                            <code>s3express:DeleteBucketPolicy</code> permission in
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
 *          <p>The following operations are related to <code>DeleteBucketPolicy</code>
 *          </p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html">DeleteObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketPolicyCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketPolicyCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketPolicyRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketPolicyCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketPolicyCommandInput - {@link DeleteBucketPolicyCommandInput}
 * @returns {@link DeleteBucketPolicyCommandOutput}
 * @see {@link DeleteBucketPolicyCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketPolicyCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete bucket policy
 * ```javascript
 * // The following example deletes bucket policy on the specified bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new DeleteBucketPolicyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteBucketPolicyCommand extends DeleteBucketPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketPolicyRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketPolicyCommandInput;
            output: DeleteBucketPolicyCommandOutput;
        };
    };
}
