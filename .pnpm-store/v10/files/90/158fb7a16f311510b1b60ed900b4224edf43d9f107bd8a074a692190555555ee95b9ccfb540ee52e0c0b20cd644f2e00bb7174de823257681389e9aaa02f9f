import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListBucketIntelligentTieringConfigurationsOutput, ListBucketIntelligentTieringConfigurationsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListBucketIntelligentTieringConfigurationsCommand}.
 */
export interface ListBucketIntelligentTieringConfigurationsCommandInput extends ListBucketIntelligentTieringConfigurationsRequest {
}
/**
 * @public
 *
 * The output of {@link ListBucketIntelligentTieringConfigurationsCommand}.
 */
export interface ListBucketIntelligentTieringConfigurationsCommandOutput extends ListBucketIntelligentTieringConfigurationsOutput, __MetadataBearer {
}
declare const ListBucketIntelligentTieringConfigurationsCommand_base: {
    new (input: ListBucketIntelligentTieringConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketIntelligentTieringConfigurationsCommandInput, ListBucketIntelligentTieringConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListBucketIntelligentTieringConfigurationsCommandInput): import("@smithy/smithy-client").CommandImpl<ListBucketIntelligentTieringConfigurationsCommandInput, ListBucketIntelligentTieringConfigurationsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Lists the S3 Intelligent-Tiering configuration from the specified bucket.</p>
 *          <p>The S3 Intelligent-Tiering storage class is designed to optimize storage costs by automatically moving data to the most cost-effective storage access tier, without performance impact or operational overhead. S3 Intelligent-Tiering delivers automatic cost savings in three low latency and high throughput access tiers. To get the lowest storage cost on data that can be accessed in minutes to hours, you can choose to activate additional archiving capabilities.</p>
 *          <p>The S3 Intelligent-Tiering storage class is  the ideal storage class for data with unknown, changing, or unpredictable access patterns, independent of object size or retention period. If the size of an object is less than 128 KB, it is not monitored and not eligible for auto-tiering. Smaller objects can be stored, but they are always charged at the Frequent Access tier rates in the S3 Intelligent-Tiering storage class.</p>
 *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html#sc-dynamic-data-access">Storage class for automatically optimizing frequently and infrequently accessed objects</a>.</p>
 *          <p>Operations related to <code>ListBucketIntelligentTieringConfigurations</code> include: </p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketIntelligentTieringConfiguration.html">DeleteBucketIntelligentTieringConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketIntelligentTieringConfiguration.html">PutBucketIntelligentTieringConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketIntelligentTieringConfiguration.html">GetBucketIntelligentTieringConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, ListBucketIntelligentTieringConfigurationsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListBucketIntelligentTieringConfigurationsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListBucketIntelligentTieringConfigurationsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContinuationToken: "STRING_VALUE",
 * };
 * const command = new ListBucketIntelligentTieringConfigurationsCommand(input);
 * const response = await client.send(command);
 * // { // ListBucketIntelligentTieringConfigurationsOutput
 * //   IsTruncated: true || false,
 * //   ContinuationToken: "STRING_VALUE",
 * //   NextContinuationToken: "STRING_VALUE",
 * //   IntelligentTieringConfigurationList: [ // IntelligentTieringConfigurationList
 * //     { // IntelligentTieringConfiguration
 * //       Id: "STRING_VALUE", // required
 * //       Filter: { // IntelligentTieringFilter
 * //         Prefix: "STRING_VALUE",
 * //         Tag: { // Tag
 * //           Key: "STRING_VALUE", // required
 * //           Value: "STRING_VALUE", // required
 * //         },
 * //         And: { // IntelligentTieringAndOperator
 * //           Prefix: "STRING_VALUE",
 * //           Tags: [ // TagSet
 * //             {
 * //               Key: "STRING_VALUE", // required
 * //               Value: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //         },
 * //       },
 * //       Status: "Enabled" || "Disabled", // required
 * //       Tierings: [ // TieringList // required
 * //         { // Tiering
 * //           Days: Number("int"), // required
 * //           AccessTier: "ARCHIVE_ACCESS" || "DEEP_ARCHIVE_ACCESS", // required
 * //         },
 * //       ],
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListBucketIntelligentTieringConfigurationsCommandInput - {@link ListBucketIntelligentTieringConfigurationsCommandInput}
 * @returns {@link ListBucketIntelligentTieringConfigurationsCommandOutput}
 * @see {@link ListBucketIntelligentTieringConfigurationsCommandInput} for command's `input` shape.
 * @see {@link ListBucketIntelligentTieringConfigurationsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class ListBucketIntelligentTieringConfigurationsCommand extends ListBucketIntelligentTieringConfigurationsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListBucketIntelligentTieringConfigurationsRequest;
            output: ListBucketIntelligentTieringConfigurationsOutput;
        };
        sdk: {
            input: ListBucketIntelligentTieringConfigurationsCommandInput;
            output: ListBucketIntelligentTieringConfigurationsCommandOutput;
        };
    };
}
