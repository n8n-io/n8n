import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutObjectRetentionOutput, PutObjectRetentionRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutObjectRetentionCommand}.
 */
export interface PutObjectRetentionCommandInput extends PutObjectRetentionRequest {
}
/**
 * @public
 *
 * The output of {@link PutObjectRetentionCommand}.
 */
export interface PutObjectRetentionCommandOutput extends PutObjectRetentionOutput, __MetadataBearer {
}
declare const PutObjectRetentionCommand_base: {
    new (input: PutObjectRetentionCommandInput): import("@smithy/smithy-client").CommandImpl<PutObjectRetentionCommandInput, PutObjectRetentionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutObjectRetentionCommandInput): import("@smithy/smithy-client").CommandImpl<PutObjectRetentionCommandInput, PutObjectRetentionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Places an Object Retention configuration on an object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html">Locking Objects</a>.
 *          Users or accounts require the <code>s3:PutObjectRetention</code> permission in order to
 *          place an Object Retention configuration on objects. Bypassing a Governance Retention
 *          configuration requires the <code>s3:BypassGovernanceRetention</code> permission. </p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutObjectRetentionCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutObjectRetentionCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutObjectRetentionRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   Retention: { // ObjectLockRetention
 *     Mode: "GOVERNANCE" || "COMPLIANCE",
 *     RetainUntilDate: new Date("TIMESTAMP"),
 *   },
 *   RequestPayer: "requester",
 *   VersionId: "STRING_VALUE",
 *   BypassGovernanceRetention: true || false,
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutObjectRetentionCommand(input);
 * const response = await client.send(command);
 * // { // PutObjectRetentionOutput
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param PutObjectRetentionCommandInput - {@link PutObjectRetentionCommandInput}
 * @returns {@link PutObjectRetentionCommandOutput}
 * @see {@link PutObjectRetentionCommandInput} for command's `input` shape.
 * @see {@link PutObjectRetentionCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutObjectRetentionCommand extends PutObjectRetentionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutObjectRetentionRequest;
            output: PutObjectRetentionOutput;
        };
        sdk: {
            input: PutObjectRetentionCommandInput;
            output: PutObjectRetentionCommandOutput;
        };
    };
}
