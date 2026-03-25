import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateStudioLifecycleConfigRequest, CreateStudioLifecycleConfigResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateStudioLifecycleConfigCommand}.
 */
export interface CreateStudioLifecycleConfigCommandInput extends CreateStudioLifecycleConfigRequest {
}
/**
 * @public
 *
 * The output of {@link CreateStudioLifecycleConfigCommand}.
 */
export interface CreateStudioLifecycleConfigCommandOutput extends CreateStudioLifecycleConfigResponse, __MetadataBearer {
}
declare const CreateStudioLifecycleConfigCommand_base: {
    new (input: CreateStudioLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateStudioLifecycleConfigCommandInput, CreateStudioLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateStudioLifecycleConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateStudioLifecycleConfigCommandInput, CreateStudioLifecycleConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a new Amazon SageMaker AI Studio Lifecycle Configuration.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateStudioLifecycleConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateStudioLifecycleConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateStudioLifecycleConfigRequest
 *   StudioLifecycleConfigName: "STRING_VALUE", // required
 *   StudioLifecycleConfigContent: "STRING_VALUE", // required
 *   StudioLifecycleConfigAppType: "JupyterServer" || "KernelGateway" || "CodeEditor" || "JupyterLab", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateStudioLifecycleConfigCommand(input);
 * const response = await client.send(command);
 * // { // CreateStudioLifecycleConfigResponse
 * //   StudioLifecycleConfigArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateStudioLifecycleConfigCommandInput - {@link CreateStudioLifecycleConfigCommandInput}
 * @returns {@link CreateStudioLifecycleConfigCommandOutput}
 * @see {@link CreateStudioLifecycleConfigCommandInput} for command's `input` shape.
 * @see {@link CreateStudioLifecycleConfigCommandOutput} for command's `response` shape.
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
export declare class CreateStudioLifecycleConfigCommand extends CreateStudioLifecycleConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateStudioLifecycleConfigRequest;
            output: CreateStudioLifecycleConfigResponse;
        };
        sdk: {
            input: CreateStudioLifecycleConfigCommandInput;
            output: CreateStudioLifecycleConfigCommandOutput;
        };
    };
}
