import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketMetricsConfigurationOutput, GetBucketMetricsConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketMetricsConfigurationCommand}.
 */
export interface GetBucketMetricsConfigurationCommandInput extends GetBucketMetricsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketMetricsConfigurationCommand}.
 */
export interface GetBucketMetricsConfigurationCommandOutput extends GetBucketMetricsConfigurationOutput, __MetadataBearer {
}
declare const GetBucketMetricsConfigurationCommand_base: {
    new (input: GetBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketMetricsConfigurationCommandInput, GetBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketMetricsConfigurationCommandInput, GetBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Gets a metrics configuration (specified by the metrics configuration ID) from the
 *          bucket. Note that this doesn't include the daily storage metrics.</p>
 *          <p> To use this operation, you must have permissions to perform the
 *             <code>s3:GetMetricsConfiguration</code> action. The bucket owner has this permission by
 *          default. The bucket owner can grant this permission to others. For more information about
 *          permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p> For information about CloudWatch request metrics for Amazon S3, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html">Monitoring
 *             Metrics with Amazon CloudWatch</a>.</p>
 *          <p>The following operations are related to
 *          <code>GetBucketMetricsConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketMetricsConfiguration.html">PutBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketMetricsConfiguration.html">DeleteBucketMetricsConfiguration</a>
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
 * import { S3Client, GetBucketMetricsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketMetricsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketMetricsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketMetricsConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketMetricsConfigurationOutput
 * //   MetricsConfiguration: { // MetricsConfiguration
 * //     Id: "STRING_VALUE", // required
 * //     Filter: { // MetricsFilter Union: only one key present
 * //       Prefix: "STRING_VALUE",
 * //       Tag: { // Tag
 * //         Key: "STRING_VALUE", // required
 * //         Value: "STRING_VALUE", // required
 * //       },
 * //       AccessPointArn: "STRING_VALUE",
 * //       And: { // MetricsAndOperator
 * //         Prefix: "STRING_VALUE",
 * //         Tags: [ // TagSet
 * //           {
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //         AccessPointArn: "STRING_VALUE",
 * //       },
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBucketMetricsConfigurationCommandInput - {@link GetBucketMetricsConfigurationCommandInput}
 * @returns {@link GetBucketMetricsConfigurationCommandOutput}
 * @see {@link GetBucketMetricsConfigurationCommandInput} for command's `input` shape.
 * @see {@link GetBucketMetricsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketMetricsConfigurationCommand extends GetBucketMetricsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketMetricsConfigurationRequest;
            output: GetBucketMetricsConfigurationOutput;
        };
        sdk: {
            input: GetBucketMetricsConfigurationCommandInput;
            output: GetBucketMetricsConfigurationCommandOutput;
        };
    };
}
