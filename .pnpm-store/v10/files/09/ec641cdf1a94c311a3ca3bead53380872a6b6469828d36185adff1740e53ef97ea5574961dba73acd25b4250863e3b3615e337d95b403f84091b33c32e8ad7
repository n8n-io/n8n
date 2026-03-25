import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListBucketMetricsConfigurationsOutput, ListBucketMetricsConfigurationsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListBucketMetricsConfigurationsCommand}.
 */
export interface ListBucketMetricsConfigurationsCommandInput extends ListBucketMetricsConfigurationsRequest {
}
/**
 * @public
 *
 * The output of {@link ListBucketMetricsConfigurationsCommand}.
 */
export interface ListBucketMetricsConfigurationsCommandOutput extends ListBucketMetricsConfigurationsOutput, __MetadataBearer {
}
declare const ListBucketMetricsConfigurationsCommand_base: {
    new (input: ListBucketMetricsConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketMetricsConfigurationsCommandInput, ListBucketMetricsConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListBucketMetricsConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketMetricsConfigurationsCommandInput, ListBucketMetricsConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Lists the metrics configurations for the bucket. The metrics configurations are only for
 *          the request metrics of the bucket and do not provide information on daily storage metrics.
 *          You can have up to 1,000 configurations per bucket.</p>
 *          <p>This action supports list pagination and does not return more than 100 configurations at
 *          a time. Always check the <code>IsTruncated</code> element in the response. If there are no
 *          more configurations to list, <code>IsTruncated</code> is set to false. If there are more
 *          configurations to list, <code>IsTruncated</code> is set to true, and there is a value in
 *             <code>NextContinuationToken</code>. You use the <code>NextContinuationToken</code> value
 *          to continue the pagination of the list by passing the value in
 *             <code>continuation-token</code> in the request to <code>GET</code> the next page.</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:GetMetricsConfiguration</code> action. The bucket owner has this permission by
 *          default. The bucket owner can grant this permission to others. For more information about
 *          permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>For more information about metrics configurations and CloudWatch request metrics, see
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cloudwatch-monitoring.html">Monitoring Metrics with Amazon CloudWatch</a>.</p>
 *          <p>The following operations are related to
 *          <code>ListBucketMetricsConfigurations</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketMetricsConfiguration.html">PutBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketMetricsConfiguration.html">GetBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketMetricsConfiguration.html">DeleteBucketMetricsConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, ListBucketMetricsConfigurationsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListBucketMetricsConfigurationsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListBucketMetricsConfigurationsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContinuationToken: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new ListBucketMetricsConfigurationsCommand(input);
 * const response = await client.send(command);
 * // { // ListBucketMetricsConfigurationsOutput
 * //   IsTruncated: true || false,
 * //   ContinuationToken: "STRING_VALUE",
 * //   NextContinuationToken: "STRING_VALUE",
 * //   MetricsConfigurationList: [ // MetricsConfigurationList
 * //     { // MetricsConfiguration
 * //       Id: "STRING_VALUE", // required
 * //       Filter: { // MetricsFilter Union: only one key present
 * //         Prefix: "STRING_VALUE",
 * //         Tag: { // Tag
 * //           Key: "STRING_VALUE", // required
 * //           Value: "STRING_VALUE", // required
 * //         },
 * //         AccessPointArn: "STRING_VALUE",
 * //         And: { // MetricsAndOperator
 * //           Prefix: "STRING_VALUE",
 * //           Tags: [ // TagSet
 * //             {
 * //               Key: "STRING_VALUE", // required
 * //               Value: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //           AccessPointArn: "STRING_VALUE",
 * //         },
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListBucketMetricsConfigurationsCommandInput - {@link ListBucketMetricsConfigurationsCommandInput}
 * @returns {@link ListBucketMetricsConfigurationsCommandOutput}
 * @see {@link ListBucketMetricsConfigurationsCommandInput} for command's `input` shape.
 * @see {@link ListBucketMetricsConfigurationsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class ListBucketMetricsConfigurationsCommand extends ListBucketMetricsConfigurationsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListBucketMetricsConfigurationsRequest;
            output: ListBucketMetricsConfigurationsOutput;
        };
        sdk: {
            input: ListBucketMetricsConfigurationsCommandInput;
            output: ListBucketMetricsConfigurationsCommandOutput;
        };
    };
}
