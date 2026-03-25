import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketCorsOutput, GetBucketCorsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketCorsCommand}.
 */
export interface GetBucketCorsCommandInput extends GetBucketCorsRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketCorsCommand}.
 */
export interface GetBucketCorsCommandOutput extends GetBucketCorsOutput, __MetadataBearer {
}
declare const GetBucketCorsCommand_base: {
    new (input: GetBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketCorsCommandInput, GetBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketCorsCommandInput, GetBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the Cross-Origin Resource Sharing (CORS) configuration information set for the
 *          bucket.</p>
 *          <p> To use this operation, you must have permission to perform the
 *             <code>s3:GetBucketCORS</code> action. By default, the bucket owner has this permission
 *          and can grant it to others.</p>
 *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
 *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
 * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
 * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
 *             Error Codes</a>.</p>
 *          <p> For more information about CORS, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html"> Enabling Cross-Origin Resource
 *          Sharing</a>.</p>
 *          <p>The following operations are related to <code>GetBucketCors</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketCors.html">PutBucketCors</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketCors.html">DeleteBucketCors</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketCorsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketCorsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketCorsRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketCorsCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketCorsOutput
 * //   CORSRules: [ // CORSRules
 * //     { // CORSRule
 * //       ID: "STRING_VALUE",
 * //       AllowedHeaders: [ // AllowedHeaders
 * //         "STRING_VALUE",
 * //       ],
 * //       AllowedMethods: [ // AllowedMethods // required
 * //         "STRING_VALUE",
 * //       ],
 * //       AllowedOrigins: [ // AllowedOrigins // required
 * //         "STRING_VALUE",
 * //       ],
 * //       ExposeHeaders: [ // ExposeHeaders
 * //         "STRING_VALUE",
 * //       ],
 * //       MaxAgeSeconds: Number("int"),
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetBucketCorsCommandInput - {@link GetBucketCorsCommandInput}
 * @returns {@link GetBucketCorsCommandOutput}
 * @see {@link GetBucketCorsCommandInput} for command's `input` shape.
 * @see {@link GetBucketCorsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get cors configuration set on a bucket
 * ```javascript
 * // The following example returns cross-origin resource sharing (CORS) configuration set on a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new GetBucketCorsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   CORSRules: [
 *     {
 *       AllowedHeaders: [
 *         "Authorization"
 *       ],
 *       AllowedMethods: [
 *         "GET"
 *       ],
 *       AllowedOrigins: [
 *         "*"
 *       ],
 *       MaxAgeSeconds: 3000
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetBucketCorsCommand extends GetBucketCorsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketCorsRequest;
            output: GetBucketCorsOutput;
        };
        sdk: {
            input: GetBucketCorsCommandInput;
            output: GetBucketCorsCommandOutput;
        };
    };
}
