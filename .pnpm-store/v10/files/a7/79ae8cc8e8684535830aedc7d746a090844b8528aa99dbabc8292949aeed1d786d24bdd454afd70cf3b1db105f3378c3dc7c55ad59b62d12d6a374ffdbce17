import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetObjectLockConfigurationOutput, GetObjectLockConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectLockConfigurationCommand}.
 */
export interface GetObjectLockConfigurationCommandInput extends GetObjectLockConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectLockConfigurationCommand}.
 */
export interface GetObjectLockConfigurationCommandOutput extends GetObjectLockConfigurationOutput, __MetadataBearer {
}
declare const GetObjectLockConfigurationCommand_base: {
    new (input: GetObjectLockConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectLockConfigurationCommandInput, GetObjectLockConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectLockConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectLockConfigurationCommandInput, GetObjectLockConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Gets the Object Lock configuration for a bucket. The rule specified in the Object Lock
 *          configuration will be applied by default to every new object placed in the specified
 *          bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html">Locking Objects</a>.</p>
 *          <p>The following action is related to <code>GetObjectLockConfiguration</code>:</p>
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
 * import { S3Client, GetObjectLockConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectLockConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectLockConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetObjectLockConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // GetObjectLockConfigurationOutput
 * //   ObjectLockConfiguration: { // ObjectLockConfiguration
 * //     ObjectLockEnabled: "Enabled",
 * //     Rule: { // ObjectLockRule
 * //       DefaultRetention: { // DefaultRetention
 * //         Mode: "GOVERNANCE" || "COMPLIANCE",
 * //         Days: Number("int"),
 * //         Years: Number("int"),
 * //       },
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param GetObjectLockConfigurationCommandInput - {@link GetObjectLockConfigurationCommandInput}
 * @returns {@link GetObjectLockConfigurationCommandOutput}
 * @see {@link GetObjectLockConfigurationCommandInput} for command's `input` shape.
 * @see {@link GetObjectLockConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetObjectLockConfigurationCommand extends GetObjectLockConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectLockConfigurationRequest;
            output: GetObjectLockConfigurationOutput;
        };
        sdk: {
            input: GetObjectLockConfigurationCommandInput;
            output: GetObjectLockConfigurationCommandOutput;
        };
    };
}
