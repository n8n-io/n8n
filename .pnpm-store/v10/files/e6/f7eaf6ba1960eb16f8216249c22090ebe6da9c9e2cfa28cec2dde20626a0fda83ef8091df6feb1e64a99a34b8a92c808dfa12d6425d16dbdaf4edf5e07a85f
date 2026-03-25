import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetPublicAccessBlockOutput, GetPublicAccessBlockRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetPublicAccessBlockCommand}.
 */
export interface GetPublicAccessBlockCommandInput extends GetPublicAccessBlockRequest {
}
/**
 * @public
 *
 * The output of {@link GetPublicAccessBlockCommand}.
 */
export interface GetPublicAccessBlockCommandOutput extends GetPublicAccessBlockOutput, __MetadataBearer {
}
declare const GetPublicAccessBlockCommand_base: {
    new (input: GetPublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<GetPublicAccessBlockCommandInput, GetPublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetPublicAccessBlockCommandInput): import("@smithy/smithy-client").CommandImpl<GetPublicAccessBlockCommandInput, GetPublicAccessBlockCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Retrieves the <code>PublicAccessBlock</code> configuration for an Amazon S3 bucket. To use
 *          this operation, you must have the <code>s3:GetBucketPublicAccessBlock</code> permission.
 *          For more information about Amazon S3 permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying Permissions in a
 *             Policy</a>.</p>
 *          <important>
 *             <p>When Amazon S3 evaluates the <code>PublicAccessBlock</code> configuration for a bucket or
 *             an object, it checks the <code>PublicAccessBlock</code> configuration for both the
 *             bucket (or the bucket that contains the object) and the bucket owner's account. If the
 *                <code>PublicAccessBlock</code> settings are different between the bucket and the
 *             account, Amazon S3 uses the most restrictive combination of the bucket-level and
 *             account-level settings.</p>
 *          </important>
 *          <p>For more information about when Amazon S3 considers a bucket or an object public, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status">The Meaning of "Public"</a>.</p>
 *          <p>The following operations are related to <code>GetPublicAccessBlock</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html">Using Amazon S3 Block
 *                   Public Access</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutPublicAccessBlock.html">PutPublicAccessBlock</a>
 *                </p>
 *             </li>
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
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetPublicAccessBlockCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetPublicAccessBlockCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetPublicAccessBlockRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetPublicAccessBlockCommand(input);
 * const response = await client.send(command);
 * // { // GetPublicAccessBlockOutput
 * //   PublicAccessBlockConfiguration: { // PublicAccessBlockConfiguration
 * //     BlockPublicAcls: true || false,
 * //     IgnorePublicAcls: true || false,
 * //     BlockPublicPolicy: true || false,
 * //     RestrictPublicBuckets: true || false,
 * //   },
 * // };
 *
 * ```
 *
 * @param GetPublicAccessBlockCommandInput - {@link GetPublicAccessBlockCommandInput}
 * @returns {@link GetPublicAccessBlockCommandOutput}
 * @see {@link GetPublicAccessBlockCommandInput} for command's `input` shape.
 * @see {@link GetPublicAccessBlockCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetPublicAccessBlockCommand extends GetPublicAccessBlockCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetPublicAccessBlockRequest;
            output: GetPublicAccessBlockOutput;
        };
        sdk: {
            input: GetPublicAccessBlockCommandInput;
            output: GetPublicAccessBlockCommandOutput;
        };
    };
}
