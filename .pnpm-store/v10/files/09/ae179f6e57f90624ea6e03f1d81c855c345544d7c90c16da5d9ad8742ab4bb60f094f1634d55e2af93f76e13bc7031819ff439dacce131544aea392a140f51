import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketLifecycleRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketLifecycleCommand}.
 */
export interface DeleteBucketLifecycleCommandInput extends DeleteBucketLifecycleRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketLifecycleCommand}.
 */
export interface DeleteBucketLifecycleCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketLifecycleCommand_base: {
    new (input: DeleteBucketLifecycleCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketLifecycleCommandInput, DeleteBucketLifecycleCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketLifecycleCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketLifecycleCommandInput, DeleteBucketLifecycleCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the lifecycle configuration from the specified bucket. Amazon S3 removes all the
 *          lifecycle configuration rules in the lifecycle subresource associated with the bucket. Your
 *          objects never expire, and Amazon S3 no longer automatically deletes any objects on the basis of
 *          rules contained in the deleted lifecycle configuration.</p>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - By
 *                         default, all Amazon S3 resources are private, including buckets, objects, and
 *                         related subresources (for example, lifecycle configuration and website
 *                         configuration). Only the resource owner (that is, the Amazon Web Services account that
 *                         created it) can access the resource. The resource owner can optionally grant
 *                         access permissions to others by writing an access policy. For this
 *                         operation, a user must have the <code>s3:PutLifecycleConfiguration</code>
 *                         permission.</p>
 *                      <p>For more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing Access
 *                            Permissions to Your Amazon S3 Resources</a>.</p>
 *                   </li>
 *                </ul>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         You must have the <code>s3express:PutLifecycleConfiguration</code>
 *                         permission in an IAM identity-based policy to use this operation.
 *                         Cross-account access to this API operation isn't supported. The resource
 *                         owner can optionally grant access permissions to others by creating a role
 *                         or user for them as long as they are within the same account as the owner
 *                         and resource.</p>
 *                      <p>For more information about directory bucket policies and permissions, see
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Authorizing Regional endpoint APIs with IAM</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                      <note>
 *                         <p>
 *                            <b>Directory buckets </b> - For directory buckets, you must make requests for this API operation to the Regional endpoint. These endpoints support path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
 *                            </code>. Virtual-hosted-style requests aren't supported.
 * For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                      </note>
 *                   </li>
 *                </ul>
 *             </dd>
 *          </dl>
 *          <dl>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host
 *                   header syntax is
 *                      <code>s3express-control.<i>region</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>For more information about the object expiration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#intro-lifecycle-rules-actions">Elements to Describe Lifecycle Actions</a>.</p>
 *          <p>Related actions include:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html">PutBucketLifecycleConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLifecycleConfiguration.html">GetBucketLifecycleConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketLifecycleCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketLifecycleCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketLifecycleRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketLifecycleCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketLifecycleCommandInput - {@link DeleteBucketLifecycleCommandInput}
 * @returns {@link DeleteBucketLifecycleCommandOutput}
 * @see {@link DeleteBucketLifecycleCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketLifecycleCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete lifecycle configuration on a bucket.
 * ```javascript
 * // The following example deletes lifecycle configuration on a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new DeleteBucketLifecycleCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteBucketLifecycleCommand extends DeleteBucketLifecycleCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketLifecycleRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketLifecycleCommandInput;
            output: DeleteBucketLifecycleCommandOutput;
        };
    };
}
