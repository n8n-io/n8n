import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketTaggingRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketTaggingCommand}.
 */
export interface DeleteBucketTaggingCommandInput extends DeleteBucketTaggingRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketTaggingCommand}.
 */
export interface DeleteBucketTaggingCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketTaggingCommand_base: {
    new (input: DeleteBucketTaggingCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketTaggingCommandInput, DeleteBucketTaggingCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketTaggingCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketTaggingCommandInput, DeleteBucketTaggingCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Deletes the tags from the bucket.</p>
 *          <p>To use this operation, you must have permission to perform the
 *             <code>s3:PutBucketTagging</code> action. By default, the bucket owner has this
 *          permission and can grant this permission to others. </p>
 *          <p>The following operations are related to <code>DeleteBucketTagging</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketTagging.html">GetBucketTagging</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketTagging.html">PutBucketTagging</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketTaggingCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketTaggingCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketTaggingRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketTaggingCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketTaggingCommandInput - {@link DeleteBucketTaggingCommandInput}
 * @returns {@link DeleteBucketTaggingCommandOutput}
 * @see {@link DeleteBucketTaggingCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketTaggingCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete bucket tags
 * ```javascript
 * // The following example deletes bucket tags.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new DeleteBucketTaggingCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteBucketTaggingCommand extends DeleteBucketTaggingCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketTaggingRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketTaggingCommandInput;
            output: DeleteBucketTaggingCommandOutput;
        };
    };
}
