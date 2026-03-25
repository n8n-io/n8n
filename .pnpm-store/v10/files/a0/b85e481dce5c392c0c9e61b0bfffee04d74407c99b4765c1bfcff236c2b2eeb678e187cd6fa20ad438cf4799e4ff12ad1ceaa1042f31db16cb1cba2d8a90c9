import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteBucketMetricsConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteBucketMetricsConfigurationCommand}.
 */
export interface DeleteBucketMetricsConfigurationCommandInput extends DeleteBucketMetricsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteBucketMetricsConfigurationCommand}.
 */
export interface DeleteBucketMetricsConfigurationCommandOutput extends __MetadataBearer {
}
declare const DeleteBucketMetricsConfigurationCommand_base: {
    new (input: DeleteBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketMetricsConfigurationCommandInput, DeleteBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteBucketMetricsConfigurationCommandInput, DeleteBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Deletes a metrics configuration for the Amazon CloudWatch request metrics (specified by the
 *          metrics configuration ID) from the bucket. Note that this doesn't include the daily storage
 *          metrics.</p>
 *          <p> To use this operation, you must have permissions to perform the
 *             <code>s3:PutMetricsConfiguration</code> action. The bucket owner has this permission by
 *          default. The bucket owner can grant this permission to others. For more information about
 *          permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>For information about CloudWatch request metrics for Amazon S3, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html">Monitoring Metrics with
 *             Amazon CloudWatch</a>. </p>
 *          <p>The following operations are related to
 *          <code>DeleteBucketMetricsConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketMetricsConfiguration.html">GetBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketMetricsConfiguration.html">PutBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBucketMetricsConfigurations.html">ListBucketMetricsConfigurations</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html">Monitoring Metrics with Amazon CloudWatch</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteBucketMetricsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteBucketMetricsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteBucketMetricsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new DeleteBucketMetricsConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteBucketMetricsConfigurationCommandInput - {@link DeleteBucketMetricsConfigurationCommandInput}
 * @returns {@link DeleteBucketMetricsConfigurationCommandOutput}
 * @see {@link DeleteBucketMetricsConfigurationCommandInput} for command's `input` shape.
 * @see {@link DeleteBucketMetricsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class DeleteBucketMetricsConfigurationCommand extends DeleteBucketMetricsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteBucketMetricsConfigurationRequest;
            output: {};
        };
        sdk: {
            input: DeleteBucketMetricsConfigurationCommandInput;
            output: DeleteBucketMetricsConfigurationCommandOutput;
        };
    };
}
