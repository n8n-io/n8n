import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketOwnershipControlsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketOwnershipControlsCommand}.
 */
export interface DeleteBucketOwnershipControlsCommandInput extends DeleteBucketOwnershipControlsRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketOwnershipControlsCommand}.
 */
export interface DeleteBucketOwnershipControlsCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketOwnershipControlsCommand_base: {
    new (input: DeleteBucketOwnershipControlsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketOwnershipControlsCommandInput, DeleteBucketOwnershipControlsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketOwnershipControlsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketOwnershipControlsCommandInput, DeleteBucketOwnershipControlsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Removes <code>OwnershipControls</code> for an Amazon S3 bucket. To use this operation, you
 *          must have the <code>s3:PutBucketOwnershipControls</code> permission. For more information
 *          about Amazon S3 permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying Permissions in a
 *             Policy</a>.</p>
 *          <p>For information about Amazon S3 Object Ownership, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/about-object-ownership.html">Using Object Ownership</a>. </p>
 *          <p>The following operations are related to
 *          <code>DeleteBucketOwnershipControls</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a>GetBucketOwnershipControls</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a>PutBucketOwnershipControls</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketOwnershipControlsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketOwnershipControlsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketOwnershipControlsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketOwnershipControlsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketOwnershipControlsCommandInput - {@link DeleteBucketOwnershipControlsCommandInput}
 * @returns {@link DeleteBucketOwnershipControlsCommandOutput}
 * @see {@link DeleteBucketOwnershipControlsCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketOwnershipControlsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class DeleteBucketOwnershipControlsCommand extends DeleteBucketOwnershipControlsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketOwnershipControlsRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketOwnershipControlsCommandInput;
            output: DeleteBucketOwnershipControlsCommandOutput;
        };
    };
}
