import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketAnalyticsConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketAnalyticsConfigurationCommand}.
 */
export interface PutBucketAnalyticsConfigurationCommandInput extends PutBucketAnalyticsConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketAnalyticsConfigurationCommand}.
 */
export interface PutBucketAnalyticsConfigurationCommandOutput extends __MetadataBearer {
}
declare const PutBucketAnalyticsConfigurationCommand_base: {
    new (input: PutBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketAnalyticsConfigurationCommandInput, PutBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketAnalyticsConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketAnalyticsConfigurationCommandInput, PutBucketAnalyticsConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets an analytics configuration for the bucket (specified by the analytics configuration
 *          ID). You can have up to 1,000 analytics configurations per bucket.</p>
 *          <p>You can choose to have storage class analysis export analysis reports sent to a
 *          comma-separated values (CSV) flat file. See the <code>DataExport</code> request element.
 *          Reports are updated daily and are based on the object filters that you configure. When
 *          selecting data export, you specify a destination bucket and an optional destination prefix
 *          where the file is written. You can export the data to a destination bucket in a different
 *          account. However, the destination bucket must be in the same Region as the bucket that you
 *          are making the PUT analytics configuration to. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/analytics-storage-class.html">Amazon S3
 *             Analytics – Storage Class Analysis</a>. </p>
 *          <important>
 *             <p>You must create a bucket policy on the destination bucket where the exported file is
 *             written to grant permissions to Amazon S3 to write objects to the bucket. For an example
 *             policy, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html#example-bucket-policies-use-case-9">Granting Permissions for Amazon S3 Inventory and Storage Class Analysis</a>.</p>
 *          </important>
 *          <p>To use this operation, you must have permissions to perform the
 *             <code>s3:PutAnalyticsConfiguration</code> action. The bucket owner has this permission
 *          by default. The bucket owner can grant this permission to others. For more information
 *          about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p>
 *             <code>PutBucketAnalyticsConfiguration</code> has the following special errors:</p>
 *          <ul>
 *             <li>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <i>HTTP Error: HTTP 400 Bad Request</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Code: InvalidArgument</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Cause: Invalid argument.</i>
 *                      </p>
 *                   </li>
 *                </ul>
 *             </li>
 *             <li>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <i>HTTP Error: HTTP 400 Bad Request</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Code: TooManyConfigurations</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Cause: You are attempting to create a new configuration but have
 *                         already reached the 1,000-configuration limit.</i>
 *                      </p>
 *                   </li>
 *                </ul>
 *             </li>
 *             <li>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <i>HTTP Error: HTTP 403 Forbidden</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Code: AccessDenied</i>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Cause: You are not the owner of the specified bucket, or you do
 *                         not have the s3:PutAnalyticsConfiguration bucket permission to set the
 *                         configuration on the bucket.</i>
 *                      </p>
 *                   </li>
 *                </ul>
 *             </li>
 *          </ul>
 *          <p>The following operations are related to
 *          <code>PutBucketAnalyticsConfiguration</code>:</p>
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
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBucketAnalyticsConfigurations.html">ListBucketAnalyticsConfigurations</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketAnalyticsConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketAnalyticsConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketAnalyticsConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   AnalyticsConfiguration: { // AnalyticsConfiguration
 *     Id: "STRING_VALUE", // required
 *     Filter: { // AnalyticsFilter Union: only one key present
 *       Prefix: "STRING_VALUE",
 *       Tag: { // Tag
 *         Key: "STRING_VALUE", // required
 *         Value: "STRING_VALUE", // required
 *       },
 *       And: { // AnalyticsAndOperator
 *         Prefix: "STRING_VALUE",
 *         Tags: [ // TagSet
 *           {
 *             Key: "STRING_VALUE", // required
 *             Value: "STRING_VALUE", // required
 *           },
 *         ],
 *       },
 *     },
 *     StorageClassAnalysis: { // StorageClassAnalysis
 *       DataExport: { // StorageClassAnalysisDataExport
 *         OutputSchemaVersion: "V_1", // required
 *         Destination: { // AnalyticsExportDestination
 *           S3BucketDestination: { // AnalyticsS3BucketDestination
 *             Format: "CSV", // required
 *             BucketAccountId: "STRING_VALUE",
 *             Bucket: "STRING_VALUE", // required
 *             Prefix: "STRING_VALUE",
 *           },
 *         },
 *       },
 *     },
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketAnalyticsConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketAnalyticsConfigurationCommandInput - {@link PutBucketAnalyticsConfigurationCommandInput}
 * @returns {@link PutBucketAnalyticsConfigurationCommandOutput}
 * @see {@link PutBucketAnalyticsConfigurationCommandInput} for command's `input` shape.
 * @see {@link PutBucketAnalyticsConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutBucketAnalyticsConfigurationCommand extends PutBucketAnalyticsConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketAnalyticsConfigurationRequest;
            output: {};
        };
        sdk: {
            input: PutBucketAnalyticsConfigurationCommandInput;
            output: PutBucketAnalyticsConfigurationCommandOutput;
        };
    };
}
