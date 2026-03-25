import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketLocationOutput, GetBucketLocationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketLocationCommand}.
 */
export interface GetBucketLocationCommandInput extends GetBucketLocationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketLocationCommand}.
 */
export interface GetBucketLocationCommandOutput extends GetBucketLocationOutput, __MetadataBearer {
}
declare const GetBucketLocationCommand_base: {
    new (input: GetBucketLocationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketLocationCommandInput, GetBucketLocationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketLocationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketLocationCommandInput, GetBucketLocationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the Region the bucket resides in. You set the bucket's Region using the
 *             <code>LocationConstraint</code> request parameter in a <code>CreateBucket</code>
 *          request. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>.</p>
 *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
 *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
 * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
 * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
 *             Error Codes</a>.</p>
 *          <note>
 *             <p>We recommend that you use <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html">HeadBucket</a> to return the Region
 *             that a bucket resides in. For backward compatibility, Amazon S3 continues to support
 *             GetBucketLocation.</p>
 *          </note>
 *          <p>The following operations are related to <code>GetBucketLocation</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
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
 * import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketLocationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketLocationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketLocationCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketLocationOutput
 * //   LocationConstraint: "af-south-1" || "ap-east-1" || "ap-northeast-1" || "ap-northeast-2" || "ap-northeast-3" || "ap-south-1" || "ap-south-2" || "ap-southeast-1" || "ap-southeast-2" || "ap-southeast-3" || "ap-southeast-4" || "ap-southeast-5" || "ca-central-1" || "cn-north-1" || "cn-northwest-1" || "EU" || "eu-central-1" || "eu-central-2" || "eu-north-1" || "eu-south-1" || "eu-south-2" || "eu-west-1" || "eu-west-2" || "eu-west-3" || "il-central-1" || "me-central-1" || "me-south-1" || "sa-east-1" || "us-east-2" || "us-gov-east-1" || "us-gov-west-1" || "us-west-1" || "us-west-2",
 * // };
 *
 * ```
 *
 * @param GetBucketLocationCommandInput - {@link GetBucketLocationCommandInput}
 * @returns {@link GetBucketLocationCommandOutput}
 * @see {@link GetBucketLocationCommandInput} for command's `input` shape.
 * @see {@link GetBucketLocationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get bucket location
 * ```javascript
 * // The following example returns bucket location.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new GetBucketLocationCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   LocationConstraint: "us-west-2"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetBucketLocationCommand extends GetBucketLocationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketLocationRequest;
            output: GetBucketLocationOutput;
        };
        sdk: {
            input: GetBucketLocationCommandInput;
            output: GetBucketLocationCommandOutput;
        };
    };
}
