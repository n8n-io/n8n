import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListBucketAnalyticsConfigurationsOutput, ListBucketAnalyticsConfigurationsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListBucketAnalyticsConfigurationsCommand}.
 */
export interface ListBucketAnalyticsConfigurationsCommandInput extends ListBucketAnalyticsConfigurationsRequest {
}
/**
 * @public
 *
 * The output of {@link ListBucketAnalyticsConfigurationsCommand}.
 */
export interface ListBucketAnalyticsConfigurationsCommandOutput extends ListBucketAnalyticsConfigurationsOutput, __MetadataBearer {
}
declare const ListBucketAnalyticsConfigurationsCommand_base: {
    new (input: ListBucketAnalyticsConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketAnalyticsConfigurationsCommandInput, ListBucketAnalyticsConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListBucketAnalyticsConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketAnalyticsConfigurationsCommandInput, ListBucketAnalyticsConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Lists the analytics configurations for the bucket. You can have up to 1,000 analytics
 *          configurations per bucket.</p>
 *          <p>This action supports list pagination and does not return more than 100 configurations at
 *          a time. You should always check the <code>IsTruncated</code> element in the response. If
 *          there are no more configurations to list, <code>IsTruncated</code> is set to false. If
 *          there are more configurations to list, <code>IsTruncated</code> is set to true, and there
 *          will be a value in <code>NextContinuationToken</code>. You use the
 *             <code>NextContinuationToken</code> value to continue the pagination of the list by
 *          passing the value in continuation-token in the request to <code>GET</code> the next
 *          page.</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:GetAnalyticsConfiguration</code> action. The bucket owner has this permission
 *          by default. The bucket owner can grant this permission to others. For more information
 *          about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>For information about Amazon S3 analytics feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/analytics-storage-class.html">Amazon S3 Analytics – Storage Class
 *             Analysis</a>. </p>
 *          <p>The following operations are related to
 *          <code>ListBucketAnalyticsConfigurations</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketAnalyticsConfiguration.html">GetBucketAnalyticsConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketAnalyticsConfiguration.html">DeleteBucketAnalyticsConfiguration</a>
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
 * import { S3Client, ListBucketAnalyticsConfigurationsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListBucketAnalyticsConfigurationsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListBucketAnalyticsConfigurationsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContinuationToken: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new ListBucketAnalyticsConfigurationsCommand(input);
 * const response = await client.send(command);
 * // { // ListBucketAnalyticsConfigurationsOutput
 * //   IsTruncated: true || false,
 * //   ContinuationToken: "STRING_VALUE",
 * //   NextContinuationToken: "STRING_VALUE",
 * //   AnalyticsConfigurationList: [ // AnalyticsConfigurationList
 * //     { // AnalyticsConfiguration
 * //       Id: "STRING_VALUE", // required
 * //       Filter: { // AnalyticsFilter Union: only one key present
 * //         Prefix: "STRING_VALUE",
 * //         Tag: { // Tag
 * //           Key: "STRING_VALUE", // required
 * //           Value: "STRING_VALUE", // required
 * //         },
 * //         And: { // AnalyticsAndOperator
 * //           Prefix: "STRING_VALUE",
 * //           Tags: [ // TagSet
 * //             {
 * //               Key: "STRING_VALUE", // required
 * //               Value: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //       },
 * //       StorageClassAnalysis: { // StorageClassAnalysis
 * //         DataExport: { // StorageClassAnalysisDataExport
 * //           OutputSchemaVersion: "V_1", // required
 * //           Destination: { // AnalyticsExportDestination
 * //             S3BucketDestination: { // AnalyticsS3BucketDestination
 * //               Format: "CSV", // required
 * //               BucketAccountId: "STRING_VALUE",
 * //               Bucket: "STRING_VALUE", // required
 * //               Prefix: "STRING_VALUE",
 * //             },
 * //           },
 * //         },
 * //       },
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListBucketAnalyticsConfigurationsCommandInput - {@link ListBucketAnalyticsConfigurationsCommandInput}
 * @returns {@link ListBucketAnalyticsConfigurationsCommandOutput}
 * @see {@link ListBucketAnalyticsConfigurationsCommandInput} for command's `input` shape.
 * @see {@link ListBucketAnalyticsConfigurationsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class ListBucketAnalyticsConfigurationsCommand extends ListBucketAnalyticsConfigurationsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListBucketAnalyticsConfigurationsRequest;
            output: ListBucketAnalyticsConfigurationsOutput;
        };
        sdk: {
            input: ListBucketAnalyticsConfigurationsCommandInput;
            output: ListBucketAnalyticsConfigurationsCommandOutput;
        };
    };
}
