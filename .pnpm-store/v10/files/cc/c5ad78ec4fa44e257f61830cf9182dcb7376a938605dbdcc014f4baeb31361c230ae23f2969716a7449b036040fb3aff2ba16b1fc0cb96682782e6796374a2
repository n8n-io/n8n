import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketRequestPaymentRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketRequestPaymentCommand}.
 */
export interface PutBucketRequestPaymentCommandInput extends PutBucketRequestPaymentRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketRequestPaymentCommand}.
 */
export interface PutBucketRequestPaymentCommandOutput extends __MetadataBearer {
}
declare const PutBucketRequestPaymentCommand_base: {
    new (input: PutBucketRequestPaymentCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketRequestPaymentCommandInput, PutBucketRequestPaymentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketRequestPaymentCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketRequestPaymentCommandInput, PutBucketRequestPaymentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets the request payment configuration for a bucket. By default, the bucket owner pays
 *          for downloads from the bucket. This configuration parameter enables the bucket owner (only)
 *          to specify that the person requesting the download will be charged for the download. For
 *          more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/RequesterPaysBuckets.html">Requester Pays
 *          Buckets</a>.</p>
 *          <p>The following operations are related to <code>PutBucketRequestPayment</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketRequestPayment.html">GetBucketRequestPayment</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketRequestPaymentCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketRequestPaymentCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketRequestPaymentRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   RequestPaymentConfiguration: { // RequestPaymentConfiguration
 *     Payer: "Requester" || "BucketOwner", // required
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketRequestPaymentCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketRequestPaymentCommandInput - {@link PutBucketRequestPaymentCommandInput}
 * @returns {@link PutBucketRequestPaymentCommandOutput}
 * @see {@link PutBucketRequestPaymentCommandInput} for command's `input` shape.
 * @see {@link PutBucketRequestPaymentCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example Set request payment configuration on a bucket.
 * ```javascript
 * // The following example sets request payment configuration on a bucket so that person requesting the download is charged.
 * const input = {
 *   Bucket: "examplebucket",
 *   RequestPaymentConfiguration: {
 *     Payer: "Requester"
 *   }
 * };
 * const command = new PutBucketRequestPaymentCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutBucketRequestPaymentCommand extends PutBucketRequestPaymentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketRequestPaymentRequest;
            output: {};
        };
        sdk: {
            input: PutBucketRequestPaymentCommandInput;
            output: PutBucketRequestPaymentCommandOutput;
        };
    };
}
