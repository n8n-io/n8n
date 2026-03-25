import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketMetadataTableConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketMetadataTableConfigurationCommand}.
 */
export interface DeleteBucketMetadataTableConfigurationCommandInput extends DeleteBucketMetadataTableConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketMetadataTableConfigurationCommand}.
 */
export interface DeleteBucketMetadataTableConfigurationCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketMetadataTableConfigurationCommand_base: {
    new (input: DeleteBucketMetadataTableConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketMetadataTableConfigurationCommandInput, DeleteBucketMetadataTableConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketMetadataTableConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketMetadataTableConfigurationCommandInput, DeleteBucketMetadataTableConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>
 *          Deletes a metadata table configuration from a general purpose bucket. For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/metadata-tables-overview.html">Accelerating data
 *             discovery with S3 Metadata</a> in the <i>Amazon S3 User Guide</i>. </p>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>To use this operation, you must have the <code>s3:DeleteBucketMetadataTableConfiguration</code> permission. For more
 *                   information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/metadata-tables-permissions.html">Setting up
 *                      permissions for configuring metadata tables</a> in the
 *                   <i>Amazon S3 User Guide</i>. </p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>DeleteBucketMetadataTableConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucketMetadataTableConfiguration.html">CreateBucketMetadataTableConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketMetadataTableConfiguration.html">GetBucketMetadataTableConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketMetadataTableConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketMetadataTableConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketMetadataTableConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketMetadataTableConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketMetadataTableConfigurationCommandInput - {@link DeleteBucketMetadataTableConfigurationCommandInput}
 * @returns {@link DeleteBucketMetadataTableConfigurationCommandOutput}
 * @see {@link DeleteBucketMetadataTableConfigurationCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketMetadataTableConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class DeleteBucketMetadataTableConfigurationCommand extends DeleteBucketMetadataTableConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketMetadataTableConfigurationRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketMetadataTableConfigurationCommandInput;
            output: DeleteBucketMetadataTableConfigurationCommandOutput;
        };
    };
}
