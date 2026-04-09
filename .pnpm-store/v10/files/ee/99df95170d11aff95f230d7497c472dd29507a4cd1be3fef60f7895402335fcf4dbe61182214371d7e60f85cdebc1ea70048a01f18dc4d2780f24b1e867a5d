import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateAppImageConfigRequest, UpdateAppImageConfigResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateAppImageConfigCommand}.
 */
export interface UpdateAppImageConfigCommandInput extends UpdateAppImageConfigRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateAppImageConfigCommand}.
 */
export interface UpdateAppImageConfigCommandOutput extends UpdateAppImageConfigResponse, __MetadataBearer {
}
declare const UpdateAppImageConfigCommand_base: {
    new (input: UpdateAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateAppImageConfigCommandInput, UpdateAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateAppImageConfigCommandInput, UpdateAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the properties of an AppImageConfig.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateAppImageConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateAppImageConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateAppImageConfigRequest
 *   AppImageConfigName: "STRING_VALUE", // required
 *   KernelGatewayImageConfig: { // KernelGatewayImageConfig
 *     KernelSpecs: [ // KernelSpecs // required
 *       { // KernelSpec
 *         Name: "STRING_VALUE", // required
 *         DisplayName: "STRING_VALUE",
 *       },
 *     ],
 *     FileSystemConfig: { // FileSystemConfig
 *       MountPath: "STRING_VALUE",
 *       DefaultUid: Number("int"),
 *       DefaultGid: Number("int"),
 *     },
 *   },
 *   JupyterLabAppImageConfig: { // JupyterLabAppImageConfig
 *     FileSystemConfig: {
 *       MountPath: "STRING_VALUE",
 *       DefaultUid: Number("int"),
 *       DefaultGid: Number("int"),
 *     },
 *     ContainerConfig: { // ContainerConfig
 *       ContainerArguments: [ // CustomImageContainerArguments
 *         "STRING_VALUE",
 *       ],
 *       ContainerEntrypoint: [ // CustomImageContainerEntrypoint
 *         "STRING_VALUE",
 *       ],
 *       ContainerEnvironmentVariables: { // CustomImageContainerEnvironmentVariables
 *         "<keys>": "STRING_VALUE",
 *       },
 *     },
 *   },
 *   CodeEditorAppImageConfig: { // CodeEditorAppImageConfig
 *     FileSystemConfig: {
 *       MountPath: "STRING_VALUE",
 *       DefaultUid: Number("int"),
 *       DefaultGid: Number("int"),
 *     },
 *     ContainerConfig: {
 *       ContainerArguments: [
 *         "STRING_VALUE",
 *       ],
 *       ContainerEntrypoint: [
 *         "STRING_VALUE",
 *       ],
 *       ContainerEnvironmentVariables: {
 *         "<keys>": "STRING_VALUE",
 *       },
 *     },
 *   },
 * };
 * const command = new UpdateAppImageConfigCommand(input);
 * const response = await client.send(command);
 * // { // UpdateAppImageConfigResponse
 * //   AppImageConfigArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateAppImageConfigCommandInput - {@link UpdateAppImageConfigCommandInput}
 * @returns {@link UpdateAppImageConfigCommandOutput}
 * @see {@link UpdateAppImageConfigCommandInput} for command's `input` shape.
 * @see {@link UpdateAppImageConfigCommandOutput} for command's `response` shape.
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
export declare class UpdateAppImageConfigCommand extends UpdateAppImageConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateAppImageConfigRequest;
            output: UpdateAppImageConfigResponse;
        };
        sdk: {
            input: UpdateAppImageConfigCommandInput;
            output: UpdateAppImageConfigCommandOutput;
        };
    };
}
