import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetObjectRetentionOutput, GetObjectRetentionRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectRetentionCommand}.
 */
export interface GetObjectRetentionCommandInput extends GetObjectRetentionRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectRetentionCommand}.
 */
export interface GetObjectRetentionCommandOutput extends GetObjectRetentionOutput, __MetadataBearer {
}
declare const GetObjectRetentionCommand_base: {
    new (input: GetObjectRetentionCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectRetentionCommandInput, GetObjectRetentionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectRetentionCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectRetentionCommandInput, GetObjectRetentionCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Retrieves an object's retention settings. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html">Locking
 *          Objects</a>.</p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 *          <p>The following action is related to <code>GetObjectRetention</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html">GetObjectAttributes</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetObjectRetentionCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectRetentionCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectRetentionRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   VersionId: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetObjectRetentionCommand(input);
 * const response = await client.send(command);
 * // { // GetObjectRetentionOutput
 * //   Retention: { // ObjectLockRetention
 * //     Mode: "GOVERNANCE" || "COMPLIANCE",
 * //     RetainUntilDate: new Date("TIMESTAMP"),
 * //   },
 * // };
 *
 * ```
 *
 * @param GetObjectRetentionCommandInput - {@link GetObjectRetentionCommandInput}
 * @returns {@link GetObjectRetentionCommandOutput}
 * @see {@link GetObjectRetentionCommandInput} for command's `input` shape.
 * @see {@link GetObjectRetentionCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetObjectRetentionCommand extends GetObjectRetentionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectRetentionRequest;
            output: GetObjectRetentionOutput;
        };
        sdk: {
            input: GetObjectRetentionCommandInput;
            output: GetObjectRetentionCommandOutput;
        };
    };
}
