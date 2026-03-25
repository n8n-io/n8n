import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateAppImageConfigRequest, CreateAppImageConfigResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateAppImageConfigCommand}.
 */
export interface CreateAppImageConfigCommandInput extends CreateAppImageConfigRequest {
}
/**
 * @public
 *
 * The output of {@link CreateAppImageConfigCommand}.
 */
export interface CreateAppImageConfigCommandOutput extends CreateAppImageConfigResponse, __MetadataBearer {
}
declare const CreateAppImageConfigCommand_base: {
    new (input: CreateAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAppImageConfigCommandInput, CreateAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateAppImageConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAppImageConfigCommandInput, CreateAppImageConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a configuration for running a SageMaker AI image as a KernelGateway app. The configuration specifies the Amazon Elastic File System storage volume on the image, and a list of the kernels in the image.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateAppImageConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateAppImageConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateAppImageConfigRequest
 *   AppImageConfigName: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
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
 * const command = new CreateAppImageConfigCommand(input);
 * const response = await client.send(command);
 * // { // CreateAppImageConfigResponse
 * //   AppImageConfigArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateAppImageConfigCommandInput - {@link CreateAppImageConfigCommandInput}
 * @returns {@link CreateAppImageConfigCommandOutput}
 * @see {@link CreateAppImageConfigCommandInput} for command's `input` shape.
 * @see {@link CreateAppImageConfigCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class CreateAppImageConfigCommand extends CreateAppImageConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateAppImageConfigRequest;
            output: CreateAppImageConfigResponse;
        };
        sdk: {
            input: CreateAppImageConfigCommandInput;
            output: CreateAppImageConfigCommandOutput;
        };
    };
}
