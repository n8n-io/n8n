import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketPolicyOutput, GetBucketPolicyRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketPolicyCommand}.
 */
export interface GetBucketPolicyCommandInput extends GetBucketPolicyRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketPolicyCommand}.
 */
export interface GetBucketPolicyCommandOutput extends GetBucketPolicyOutput, __MetadataBearer {
}
declare const GetBucketPolicyCommand_base: {
    new (input: GetBucketPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketPolicyCommandInput, GetBucketPolicyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketPolicyCommandInput, GetBucketPolicyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns the policy of a specified bucket.</p>
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
 *                      <code>GetBucketPolicy</code> permissions on the specified bucket and belong to
 *                   the bucket owner's account in order to use this operation.</p>
 *                <p>If you don't have <code>GetBucketPolicy</code> permissions, Amazon S3 returns a
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
 *                            <code>s3:GetBucketPolicy</code> permission is required in a policy. For
 *                         more information about general purpose buckets bucket policies, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html">Using Bucket Policies and User Policies</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         To grant access to this API operation, you must have the
 *                            <code>s3express:GetBucketPolicy</code> permission in
 *                         an IAM identity-based policy instead of a bucket policy. Cross-account access to this API operation isn't supported. This operation can only be performed by the Amazon Web Services account that owns the resource.
 *                         For more information about directory bucket policies and permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Amazon Web Services Identity and Access Management (IAM) for S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Example bucket policies</dt>
 *             <dd>
 *                <p>
 *                   <b>General purpose buckets example bucket policies</b>
 *                   - See <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html">Bucket policy
 *                      examples</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                <p>
 *                   <b>Directory bucket example bucket policies</b>
 *                   - See <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-example-bucket-policies.html">Example bucket policies for S3 Express One Zone</a> in the
 *                      <i>Amazon S3 User Guide</i>.</p>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>s3express-control.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following action is related to <code>GetBucketPolicy</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketPolicyCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketPolicyCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketPolicyRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketPolicyCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketPolicyOutput
 * //   Policy: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetBucketPolicyCommandInput - {@link GetBucketPolicyCommandInput}
 * @returns {@link GetBucketPolicyCommandOutput}
 * @see {@link GetBucketPolicyCommandInput} for command's `input` shape.
 * @see {@link GetBucketPolicyCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get bucket policy
 * ```javascript
 * // The following example returns bucket policy associated with a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new GetBucketPolicyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Policy: `{"Version":"2008-10-17","Id":"LogPolicy","Statement":[{"Sid":"Enables the log delivery group to publish logs to your bucket ","Effect":"Allow","Principal":{"AWS":"111122223333"},"Action":["s3:GetBucketAcl","s3:GetObjectAcl","s3:PutObject"],"Resource":["arn:aws:s3:::policytest1/*","arn:aws:s3:::policytest1"]}]}`
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetBucketPolicyCommand extends GetBucketPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketPolicyRequest;
            output: GetBucketPolicyOutput;
        };
        sdk: {
            input: GetBucketPolicyCommandInput;
            output: GetBucketPolicyCommandOutput;
        };
    };
}
