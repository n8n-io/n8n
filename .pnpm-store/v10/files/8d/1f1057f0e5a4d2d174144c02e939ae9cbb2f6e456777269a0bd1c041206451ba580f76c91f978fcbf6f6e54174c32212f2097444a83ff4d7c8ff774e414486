import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketAnalyticsConfigurationOutput, GetBucketAnalyticsConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketAnalyticsConfigurationCommand}.
 */
export interface GetBucketAnalyticsConfigurationCommandInput extends GetBucketAnalyticsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketAnalyticsConfigurationCommand}.
 */
export interface GetBucketAnalyticsConfigurationCommandOutput extends GetBucketAnalyticsConfigurationOutput, __MetadataBearer {
}
declare const GetBucketAnalyticsConfigurationCommand_base: {
    new (input: GetBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketAnalyticsConfigurationCommandInput, GetBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketAnalyticsConfigurationCommandInput, GetBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>This implementation of the GET action returns an analytics configuration (identified by
 *          the analytics configuration ID) from the bucket.</p>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:GetAnalyticsConfiguration</code> action. The bucket owner has this permission
 *          by default. The bucket owner can grant this permission to others. For more information
 *          about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources"> Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a> in the
 *             <i>Amazon S3 User Guide</i>. </p>
 *          <p>For information about Amazon S3 analytics feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/analytics-storage-class.html">Amazon S3 Analytics – Storage Class
 *             Analysis</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <p>The following operations are related to
 *          <code>GetBucketAnalyticsConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketAnalyticsConfiguration.html">DeleteBucketAnalyticsConfiguration</a>
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
 * import { S3Client, GetBucketAnalyticsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketAnalyticsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketAnalyticsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketAnalyticsConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketAnalyticsConfigurationOutput
 * //   AnalyticsConfiguration: { // AnalyticsConfiguration
 * //     Id: "STRING_VALUE", // required
 * //     Filter: { // AnalyticsFilter Union: only one key present
 * //       Prefix: "STRING_VALUE",
 * //       Tag: { // Tag
 * //         Key: "STRING_VALUE", // required
 * //         Value: "STRING_VALUE", // required
 * //       },
 * //       And: { // AnalyticsAndOperator
 * //         Prefix: "STRING_VALUE",
 * //         Tags: [ // TagSet
 * //           {
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //     },
 * //     StorageClassAnalysis: { // StorageClassAnalysis
 * //       DataExport: { // StorageClassAnalysisDataExport
 * //         OutputSchemaVersion: "V_1", // required
 * //         Destination: { // AnalyticsExportDestination
 * //           S3BucketDestination: { // AnalyticsS3BucketDestination
 * //             Format: "CSV", // required
 * //             BucketAccountId: "STRING_VALUE",
 * //             Bucket: "STRING_VALUE", // required
 * //             Prefix: "STRING_VALUE",
 * //           },
 * //         },
 * //       },
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBucketAnalyticsConfigurationCommandInput - {@link GetBucketAnalyticsConfigurationCommandInput}
 * @returns {@link GetBucketAnalyticsConfigurationCommandOutput}
 * @see {@link GetBucketAnalyticsConfigurationCommandInput} for command's `input` shape.
 * @see {@link GetBucketAnalyticsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketAnalyticsConfigurationCommand extends GetBucketAnalyticsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketAnalyticsConfigurationRequest;
            output: GetBucketAnalyticsConfigurationOutput;
        };
        sdk: {
            input: GetBucketAnalyticsConfigurationCommandInput;
            output: GetBucketAnalyticsConfigurationCommandOutput;
        };
    };
}
