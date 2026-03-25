import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketAccelerateConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketAccelerateConfigurationCommand}.
 */
export interface PutBucketAccelerateConfigurationCommandInput extends PutBucketAccelerateConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketAccelerateConfigurationCommand}.
 */
export interface PutBucketAccelerateConfigurationCommandOutput extends __MetadataBearer {
}
declare const PutBucketAccelerateConfigurationCommand_base: {
    new (input: PutBucketAccelerateConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketAccelerateConfigurationCommandInput, PutBucketAccelerateConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketAccelerateConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketAccelerateConfigurationCommandInput, PutBucketAccelerateConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets the accelerate configuration of an existing bucket. Amazon S3 Transfer Acceleration is a
 *          bucket-level feature that enables you to perform faster data transfers to Amazon S3.</p>
 *          <p> To use this operation, you must have permission to perform the
 *             <code>s3:PutAccelerateConfiguration</code> action. The bucket owner has this permission
 *          by default. The bucket owner can grant this permission to others. For more information
 *          about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing
 *             Access Permissions to Your Amazon S3 Resources</a>.</p>
 *          <p> The Transfer Acceleration state of a bucket can be set to one of the following two
 *          values:</p>
 *          <ul>
 *             <li>
 *                <p> Enabled – Enables accelerated data transfers to the bucket.</p>
 *             </li>
 *             <li>
 *                <p> Suspended – Disables accelerated data transfers to the bucket.</p>
 *             </li>
 *          </ul>
 *          <p>The <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketAccelerateConfiguration.html">GetBucketAccelerateConfiguration</a> action returns the transfer acceleration state
 *          of a bucket.</p>
 *          <p>After setting the Transfer Acceleration state of a bucket to Enabled, it might take up
 *          to thirty minutes before the data transfer rates to the bucket increase.</p>
 *          <p> The name of the bucket used for Transfer Acceleration must be DNS-compliant and must
 *          not contain periods (".").</p>
 *          <p> For more information about transfer acceleration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/transfer-acceleration.html">Transfer
 *          Acceleration</a>.</p>
 *          <p>The following operations are related to
 *          <code>PutBucketAccelerateConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketAccelerateConfiguration.html">GetBucketAccelerateConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketAccelerateConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketAccelerateConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketAccelerateConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   AccelerateConfiguration: { // AccelerateConfiguration
 *     Status: "Enabled" || "Suspended",
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * };
 * const command = new PutBucketAccelerateConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketAccelerateConfigurationCommandInput - {@link PutBucketAccelerateConfigurationCommandInput}
 * @returns {@link PutBucketAccelerateConfigurationCommandOutput}
 * @see {@link PutBucketAccelerateConfigurationCommandInput} for command's `input` shape.
 * @see {@link PutBucketAccelerateConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutBucketAccelerateConfigurationCommand extends PutBucketAccelerateConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketAccelerateConfigurationRequest;
            output: {};
        };
        sdk: {
            input: PutBucketAccelerateConfigurationCommandInput;
            output: PutBucketAccelerateConfigurationCommandOutput;
        };
    };
}
