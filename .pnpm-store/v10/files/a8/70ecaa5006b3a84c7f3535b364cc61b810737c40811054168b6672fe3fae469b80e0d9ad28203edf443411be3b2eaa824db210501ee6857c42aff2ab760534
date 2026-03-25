import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketAnalyticsConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketAnalyticsConfigurationCommand}.
 */
export interface DeleteBucketAnalyticsConfigurationCommandInput extends DeleteBucketAnalyticsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketAnalyticsConfigurationCommand}.
 */
export interface DeleteBucketAnalyticsConfigurationCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketAnalyticsConfigurationCommand_base: {
    new (input: DeleteBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketAnalyticsConfigurationCommandInput, DeleteBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketAnalyticsConfigurationCommandInput, DeleteBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Deletes an analytics configuration for the bucket (specified by the analytics
 *          configuration ID).</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:PutAnalyticsConfiguration</code> action. The bucket owner has this permission
 *          by default. The bucket owner can grant this permission to others. For more information
 *          about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>For information about the Amazon S3 analytics feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/analytics-storage-class.html">Amazon S3 Analytics – Storage Class
 *             Analysis</a>. </p>
 *          <p>The following operations are related to
 *          <code>DeleteBucketAnalyticsConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketAnalyticsConfiguration.html">GetBucketAnalyticsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBucketAnalyticsConfigurations.html">ListBucketAnalyticsConfigurations</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketAnalyticsConfiguration.html">PutBucketAnalyticsConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketAnalyticsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketAnalyticsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketAnalyticsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketAnalyticsConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketAnalyticsConfigurationCommandInput - {@link DeleteBucketAnalyticsConfigurationCommandInput}
 * @returns {@link DeleteBucketAnalyticsConfigurationCommandOutput}
 * @see {@link DeleteBucketAnalyticsConfigurationCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketAnalyticsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class DeleteBucketAnalyticsConfigurationCommand extends DeleteBucketAnalyticsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketAnalyticsConfigurationRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketAnalyticsConfigurationCommandInput;
            output: DeleteBucketAnalyticsConfigurationCommandOutput;
        };
    };
}
