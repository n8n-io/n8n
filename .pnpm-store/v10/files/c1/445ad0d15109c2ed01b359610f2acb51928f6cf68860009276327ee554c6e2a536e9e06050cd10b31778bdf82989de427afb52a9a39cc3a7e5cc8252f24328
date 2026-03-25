import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeStudioLifecycleConfigRequest, DescribeStudioLifecycleConfigResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeStudioLifecycleConfigCommand}.
 */
export interface DescribeStudioLifecycleConfigCommandInput extends DescribeStudioLifecycleConfigRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeStudioLifecycleConfigCommand}.
 */
export interface DescribeStudioLifecycleConfigCommandOutput extends DescribeStudioLifecycleConfigResponse, __MetadataBearer {
}
declare const DescribeStudioLifecycleConfigCommand_base: {
    new (input: DescribeStudioLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeStudioLifecycleConfigCommandInput, DescribeStudioLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeStudioLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeStudioLifecycleConfigCommandInput, DescribeStudioLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes the Amazon SageMaker AI Studio Lifecycle Configuration.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeStudioLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeStudioLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeStudioLifecycleConfigRequest
 *   StudioLifecycleConfigName: "STRING_VALUE", // required
 * };
 * const command = new DescribeStudioLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // { // DescribeStudioLifecycleConfigResponse
 * //   StudioLifecycleConfigArn: "STRING_VALUE",
 * //   StudioLifecycleConfigName: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   StudioLifecycleConfigContent: "STRING_VALUE",
 * //   StudioLifecycleConfigAppType: "JupyterServer" || "KernelGateway" || "CodeEditor" || "JupyterLab",
 * // };
 *
 * ```
 *
 * @param DescribeStudioLifecycleConfigCommandInput - {@link DescribeStudioLifecycleConfigCommandInput}
 * @returns {@link DescribeStudioLifecycleConfigCommandOutput}
 * @see {@link DescribeStudioLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link DescribeStudioLifecycleConfigCommandOutput} for command's `response` shape.
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
export declare class DescribeStudioLifecycleConfigCommand extends DescribeStudioLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeStudioLifecycleConfigRequest;
            output: DescribeStudioLifecycleConfigResponse;
        };
        sdk: {
            input: DescribeStudioLifecycleConfigCommandInput;
            output: DescribeStudioLifecycleConfigCommandOutput;
        };
    };
}
