import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeAppImageConfigRequest, DescribeAppImageConfigResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeAppImageConfigCommand}.
 */
export interface DescribeAppImageConfigCommandInput extends DescribeAppImageConfigRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeAppImageConfigCommand}.
 */
export interface DescribeAppImageConfigCommandOutput extends DescribeAppImageConfigResponse, __MetadataBearer {
}
declare const DescribeAppImageConfigCommand_base: {
    new (input: DescribeAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAppImageConfigCommandInput, DescribeAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAppImageConfigCommandInput, DescribeAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes an AppImageConfig.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeAppImageConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeAppImageConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeAppImageConfigRequest
 *   AppImageConfigName: "STRING_VALUE", // required
 * };
 * const command = new DescribeAppImageConfigCommand(input);
 * const response = await client.send(command);
 * // { // DescribeAppImageConfigResponse
 * //   AppImageConfigArn: "STRING_VALUE",
 * //   AppImageConfigName: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   KernelGatewayImageConfig: { // KernelGatewayImageConfig
 * //     KernelSpecs: [ // KernelSpecs // required
 * //       { // KernelSpec
 * //         Name: "STRING_VALUE", // required
 * //         DisplayName: "STRING_VALUE",
 * //       },
 * //     ],
 * //     FileSystemConfig: { // FileSystemConfig
 * //       MountPath: "STRING_VALUE",
 * //       DefaultUid: Number("int"),
 * //       DefaultGid: Number("int"),
 * //     },
 * //   },
 * //   JupyterLabAppImageConfig: { // JupyterLabAppImageConfig
 * //     FileSystemConfig: {
 * //       MountPath: "STRING_VALUE",
 * //       DefaultUid: Number("int"),
 * //       DefaultGid: Number("int"),
 * //     },
 * //     ContainerConfig: { // ContainerConfig
 * //       ContainerArguments: [ // CustomImageContainerArguments
 * //         "STRING_VALUE",
 * //       ],
 * //       ContainerEntrypoint: [ // CustomImageContainerEntrypoint
 * //         "STRING_VALUE",
 * //       ],
 * //       ContainerEnvironmentVariables: { // CustomImageContainerEnvironmentVariables
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //   },
 * //   CodeEditorAppImageConfig: { // CodeEditorAppImageConfig
 * //     FileSystemConfig: {
 * //       MountPath: "STRING_VALUE",
 * //       DefaultUid: Number("int"),
 * //       DefaultGid: Number("int"),
 * //     },
 * //     ContainerConfig: {
 * //       ContainerArguments: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ContainerEntrypoint: [
 * //         "STRING_VALUE",
 * //       ],
 * //       ContainerEnvironmentVariables: {
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeAppImageConfigCommandInput - {@link DescribeAppImageConfigCommandInput}
 * @returns {@link DescribeAppImageConfigCommandOutput}
 * @see {@link DescribeAppImageConfigCommandInput} for command's `input` shape.
 * @see {@link DescribeAppImageConfigCommandOutput} for command's `response` shape.
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
export declare class DescribeAppImageConfigCommand extends DescribeAppImageConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeAppImageConfigRequest;
            output: DescribeAppImageConfigResponse;
        };
        sdk: {
            input: DescribeAppImageConfigCommandInput;
            output: DescribeAppImageConfigCommandOutput;
        };
    };
}
