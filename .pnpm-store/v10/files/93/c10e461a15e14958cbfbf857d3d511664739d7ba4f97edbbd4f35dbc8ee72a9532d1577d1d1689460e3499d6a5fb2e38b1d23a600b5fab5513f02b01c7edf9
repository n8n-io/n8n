import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeImageRequest, DescribeImageResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeImageCommand}.
 */
export interface DescribeImageCommandInput extends DescribeImageRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeImageCommand}.
 */
export interface DescribeImageCommandOutput extends DescribeImageResponse, __MetadataBearer {
}
declare const DescribeImageCommand_base: {
    new (input: DescribeImageCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeImageCommandInput, DescribeImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeImageCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeImageCommandInput, DescribeImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes a SageMaker AI image.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeImageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeImageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeImageRequest
 *   ImageName: "STRING_VALUE", // required
 * };
 * const command = new DescribeImageCommand(input);
 * const response = await client.send(command);
 * // { // DescribeImageResponse
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   Description: "STRING_VALUE",
 * //   DisplayName: "STRING_VALUE",
 * //   FailureReason: "STRING_VALUE",
 * //   ImageArn: "STRING_VALUE",
 * //   ImageName: "STRING_VALUE",
 * //   ImageStatus: "CREATING" || "CREATED" || "CREATE_FAILED" || "UPDATING" || "UPDATE_FAILED" || "DELETING" || "DELETE_FAILED",
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   RoleArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeImageCommandInput - {@link DescribeImageCommandInput}
 * @returns {@link DescribeImageCommandOutput}
 * @see {@link DescribeImageCommandInput} for command's `input` shape.
 * @see {@link DescribeImageCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeImageCommand extends DescribeImageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeImageRequest;
            output: DescribeImageResponse;
        };
        sdk: {
            input: DescribeImageCommandInput;
            output: DescribeImageCommandOutput;
        };
    };
}
