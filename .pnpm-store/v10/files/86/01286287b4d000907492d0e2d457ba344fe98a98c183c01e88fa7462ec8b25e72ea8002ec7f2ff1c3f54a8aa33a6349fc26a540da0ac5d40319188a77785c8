import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeletePublicAccessBlockRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeletePublicAccessBlockCommand}.
 */
export interface DeletePublicAccessBlockCommandInput extends DeletePublicAccessBlockRequest {
}
/**
 * @public
 *
 * The output of {@link DeletePublicAccessBlockCommand}.
 */
export interface DeletePublicAccessBlockCommandOutput extends __MetadataBearer {
}
declare const DeletePublicAccessBlockCommand_base: {
    new (input: DeletePublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePublicAccessBlockCommandInput, DeletePublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeletePublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePublicAccessBlockCommandInput, DeletePublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Removes the <code>PublicAccessBlock</code> configuration for an Amazon S3 bucket. To use this
 *          operation, you must have the <code>s3:PutBucketPublicAccessBlock</code> permission. For
 *          more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>The following operations are related to <code>DeletePublicAccessBlock</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html">Using Amazon S3 Block
 *                   Public Access</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetPublicAccessBlock.html">GetPublicAccessBlock</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutPublicAccessBlock.html">PutPublicAccessBlock</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketPolicyStatus.html">GetBucketPolicyStatus</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeletePublicAccessBlockCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeletePublicAccessBlockCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeletePublicAccessBlockRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeletePublicAccessBlockCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeletePublicAccessBlockCommandInput - {@link DeletePublicAccessBlockCommandInput}
 * @returns {@link DeletePublicAccessBlockCommandOutput}
 * @see {@link DeletePublicAccessBlockCommandInput} for command's `input` shape.
 * @see {@link DeletePublicAccessBlockCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class DeletePublicAccessBlockCommand extends DeletePublicAccessBlockCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeletePublicAccessBlockRequest;
            output: {};
        };
        sdk: {
            input: DeletePublicAccessBlockCommandInput;
            output: DeletePublicAccessBlockCommandOutput;
        };
    };
}
