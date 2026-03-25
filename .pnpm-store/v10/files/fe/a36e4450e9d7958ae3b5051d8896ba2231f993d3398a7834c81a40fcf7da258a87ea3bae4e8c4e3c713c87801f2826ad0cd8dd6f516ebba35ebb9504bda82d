import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketReplicationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketReplicationCommand}.
 */
export interface DeleteBucketReplicationCommandInput extends DeleteBucketReplicationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketReplicationCommand}.
 */
export interface DeleteBucketReplicationCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketReplicationCommand_base: {
    new (input: DeleteBucketReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketReplicationCommandInput, DeleteBucketReplicationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketReplicationCommandInput, DeleteBucketReplicationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p> Deletes the replication configuration from the bucket.</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:PutReplicationConfiguration</code> action. The bucket owner has these
 *          permissions by default and can grant it to others. For more information about permissions,
 *          see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>. </p>
 *          <note>
 *             <p>It can take a while for the deletion of a replication configuration to fully
 *             propagate.</p>
 *          </note>
 *          <p> For information about replication configuration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication.html">Replication</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          <p>The following operations are related to <code>DeleteBucketReplication</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketReplication.html">PutBucketReplication</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketReplication.html">GetBucketReplication</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketReplicationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketReplicationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketReplicationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketReplicationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketReplicationCommandInput - {@link DeleteBucketReplicationCommandInput}
 * @returns {@link DeleteBucketReplicationCommandOutput}
 * @see {@link DeleteBucketReplicationCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketReplicationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete bucket replication configuration
 * ```javascript
 * // The following example deletes replication configuration set on bucket.
 * const input = {
 *   Bucket: "example"
 * };
 * const command = new DeleteBucketReplicationCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteBucketReplicationCommand extends DeleteBucketReplicationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketReplicationRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketReplicationCommandInput;
            output: DeleteBucketReplicationCommandOutput;
        };
    };
}
