import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketPolicyStatusOutput, GetBucketPolicyStatusRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketPolicyStatusCommand}.
 */
export interface GetBucketPolicyStatusCommandInput extends GetBucketPolicyStatusRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketPolicyStatusCommand}.
 */
export interface GetBucketPolicyStatusCommandOutput extends GetBucketPolicyStatusOutput, __MetadataBearer {
}
declare const GetBucketPolicyStatusCommand_base: {
    new (input: GetBucketPolicyStatusCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketPolicyStatusCommandInput, GetBucketPolicyStatusCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketPolicyStatusCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketPolicyStatusCommandInput, GetBucketPolicyStatusCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Retrieves the policy status for an Amazon S3 bucket, indicating whether the bucket is public.
 *          In order to use this operation, you must have the <code>s3:GetBucketPolicyStatus</code>
 *          permission. For more information about Amazon S3 permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying Permissions in a
 *             Policy</a>.</p>
 *          <p> For more information about when Amazon S3 considers a bucket public, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status">The Meaning of "Public"</a>. </p>
 *          <p>The following operations are related to <code>GetBucketPolicyStatus</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html">Using Amazon S3 Block
 *                   Public Access</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetPublicAccessBlock.html">GetPublicAccessBlock</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutPublicAccessBlock.html">PutPublicAccessBlock</a>
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
 * import { S3Client, GetBucketPolicyStatusCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketPolicyStatusCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketPolicyStatusRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketPolicyStatusCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketPolicyStatusOutput
 * //   PolicyStatus: { // PolicyStatus
 * //     IsPublic: true || false,
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBucketPolicyStatusCommandInput - {@link GetBucketPolicyStatusCommandInput}
 * @returns {@link GetBucketPolicyStatusCommandOutput}
 * @see {@link GetBucketPolicyStatusCommandInput} for command's `input` shape.
 * @see {@link GetBucketPolicyStatusCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketPolicyStatusCommand extends GetBucketPolicyStatusCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketPolicyStatusRequest;
            output: GetBucketPolicyStatusOutput;
        };
        sdk: {
            input: GetBucketPolicyStatusCommandInput;
            output: GetBucketPolicyStatusCommandOutput;
        };
    };
}
