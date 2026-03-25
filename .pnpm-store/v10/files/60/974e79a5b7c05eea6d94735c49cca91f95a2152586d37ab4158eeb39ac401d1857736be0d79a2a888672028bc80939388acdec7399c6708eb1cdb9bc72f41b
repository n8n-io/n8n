import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketMetricsConfigurationRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketMetricsConfigurationCommand}.
 */
export interface PutBucketMetricsConfigurationCommandInput extends PutBucketMetricsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketMetricsConfigurationCommand}.
 */
export interface PutBucketMetricsConfigurationCommandOutput extends __MetadataBearer {
}
declare const PutBucketMetricsConfigurationCommand_base: {
    new (input: PutBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketMetricsConfigurationCommandInput, PutBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketMetricsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketMetricsConfigurationCommandInput, PutBucketMetricsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets a metrics configuration (specified by the metrics configuration ID) for the bucket.
 *          You can have up to 1,000 metrics configurations per bucket. If you're updating an existing
 *          metrics configuration, note that this is a full replacement of the existing metrics
 *          configuration. If you don't include the elements you want to keep, they are erased.</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:PutMetricsConfiguration</code> action. The bucket owner has this permission by
 *          default. The bucket owner can grant this permission to others. For more information about
 *          permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>For information about CloudWatch request metrics for Amazon S3, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html">Monitoring
 *             Metrics with Amazon CloudWatch</a>.</p>
 *          <p>The following operations are related to
 *          <code>PutBucketMetricsConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketMetricsConfiguration.html">DeleteBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketMetricsConfiguration.html">GetBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBucketMetricsConfigurations.html">ListBucketMetricsConfigurations</a>
 *                </p>
 *             </li>
 *          </ul>
 *          <p>
 *             <code>PutBucketMetricsConfiguration</code> has the following special error:</p>
 *          <ul>
 *             <li>
 *                <p>Error code: <code>TooManyConfigurations</code>
 *                </p>
 *                <ul>
 *                   <li>
 *                      <p>Description: You are attempting to create a new configuration but have
 *                      already reached the 1,000-configuration limit.</p>
 *                   </li>
 *                   <li>
 *                      <p>HTTP Status Code: HTTP 400 Bad Request</p>
 *                   </li>
 *                </ul>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketMetricsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketMetricsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketMetricsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   MetricsConfiguration: { // MetricsConfiguration
 *     Id: "STRING_VALUE", // required
 *     Filter: { // MetricsFilter Union: only one key present
 *       Prefix: "STRING_VALUE",
 *       Tag: { // Tag
 *         Key: "STRING_VALUE", // required
 *         Value: "STRING_VALUE", // required
 *       },
 *       AccessPointArn: "STRING_VALUE",
 *       And: { // MetricsAndOperator
 *         Prefix: "STRING_VALUE",
 *         Tags: [ // TagSet
 *           {
 *             Key: "STRING_VALUE", // required
 *             Value: "STRING_VALUE", // required
 *           },
 *         ],
 *         AccessPointArn: "STRING_VALUE",
 *       },
 *     },
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketMetricsConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketMetricsConfigurationCommandInput - {@link PutBucketMetricsConfigurationCommandInput}
 * @returns {@link PutBucketMetricsConfigurationCommandOutput}
 * @see {@link PutBucketMetricsConfigurationCommandInput} for command's `input` shape.
 * @see {@link PutBucketMetricsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutBucketMetricsConfigurationCommand extends PutBucketMetricsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketMetricsConfigurationRequest;
            output: {};
        };
        sdk: {
            input: PutBucketMetricsConfigurationCommandInput;
            output: PutBucketMetricsConfigurationCommandOutput;
        };
    };
}
