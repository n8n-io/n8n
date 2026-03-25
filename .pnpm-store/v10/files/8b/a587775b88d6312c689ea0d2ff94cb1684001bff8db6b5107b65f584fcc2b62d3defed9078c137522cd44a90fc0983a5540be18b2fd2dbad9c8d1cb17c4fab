import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutPublicAccessBlockRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutPublicAccessBlockCommand}.
 */
export interface PutPublicAccessBlockCommandInput extends PutPublicAccessBlockRequest {
}
/**
 * @public
 *
 * The output of {@link PutPublicAccessBlockCommand}.
 */
export interface PutPublicAccessBlockCommandOutput extends __MetadataBearer {
}
declare const PutPublicAccessBlockCommand_base: {
    new (input: PutPublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<PutPublicAccessBlockCommandInput, PutPublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutPublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<PutPublicAccessBlockCommandInput, PutPublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Creates or modifies the <code>PublicAccessBlock</code> configuration for an Amazon S3 bucket.
 *          To use this operation, you must have the <code>s3:PutBucketPublicAccessBlock</code>
 *          permission. For more information about Amazon S3 permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying Permissions in a
 *             Policy</a>.</p>
 *          <important>
 *             <p>When Amazon S3 evaluates the <code>PublicAccessBlock</code> configuration for a bucket or
 *             an object, it checks the <code>PublicAccessBlock</code> configuration for both the
 *             bucket (or the bucket that contains the object) and the bucket owner's account. If the
 *                <code>PublicAccessBlock</code> configurations are different between the bucket and
 *             the account, Amazon S3 uses the most restrictive combination of the bucket-level and
 *             account-level settings.</p>
 *          </important>
 *          <p>For more information about when Amazon S3 considers a bucket or an object public, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status">The Meaning of "Public"</a>.</p>
 *          <p>The following operations are related to <code>PutPublicAccessBlock</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetPublicAccessBlock.html">GetPublicAccessBlock</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeletePublicAccessBlock.html">DeletePublicAccessBlock</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketPolicyStatus.html">GetBucketPolicyStatus</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html">Using Amazon S3 Block
 *                   Public Access</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutPublicAccessBlockCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutPublicAccessBlockCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutPublicAccessBlockRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   PublicAccessBlockConfiguration: { // PublicAccessBlockConfiguration
 *     BlockPublicAcls: true || false,
 *     IgnorePublicAcls: true || false,
 *     BlockPublicPolicy: true || false,
 *     RestrictPublicBuckets: true || false,
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutPublicAccessBlockCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutPublicAccessBlockCommandInput - {@link PutPublicAccessBlockCommandInput}
 * @returns {@link PutPublicAccessBlockCommandOutput}
 * @see {@link PutPublicAccessBlockCommandInput} for command's `input` shape.
 * @see {@link PutPublicAccessBlockCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutPublicAccessBlockCommand extends PutPublicAccessBlockCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutPublicAccessBlockRequest;
            output: {};
        };
        sdk: {
            input: PutPublicAccessBlockCommandInput;
            output: PutPublicAccessBlockCommandOutput;
        };
    };
}
