import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketCorsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketCorsCommand}.
 */
export interface DeleteBucketCorsCommandInput extends DeleteBucketCorsRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketCorsCommand}.
 */
export interface DeleteBucketCorsCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketCorsCommand_base: {
    new (input: DeleteBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketCorsCommandInput, DeleteBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketCorsCommandInput, DeleteBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Deletes the <code>cors</code> configuration information set for the bucket.</p>
 *          <p>To use this operation, you must have permission to perform the
 *             <code>s3:PutBucketCORS</code> action. The bucket owner has this permission by default
 *          and can grant this permission to others. </p>
 *          <p>For information about <code>cors</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html">Enabling Cross-Origin Resource Sharing</a> in
 *          the <i>Amazon S3 User Guide</i>.</p>
 *          <p class="title">
 *             <b>Related Resources</b>
 *          </p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketCors.html">PutBucketCors</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTOPTIONSobject.html">RESTOPTIONSobject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketCorsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketCorsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketCorsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketCorsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketCorsCommandInput - {@link DeleteBucketCorsCommandInput}
 * @returns {@link DeleteBucketCorsCommandOutput}
 * @see {@link DeleteBucketCorsCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketCorsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete cors configuration on a bucket.
 * ```javascript
 * // The following example deletes CORS configuration on a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new DeleteBucketCorsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteBucketCorsCommand extends DeleteBucketCorsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketCorsRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketCorsCommandInput;
            output: DeleteBucketCorsCommandOutput;
        };
    };
}
