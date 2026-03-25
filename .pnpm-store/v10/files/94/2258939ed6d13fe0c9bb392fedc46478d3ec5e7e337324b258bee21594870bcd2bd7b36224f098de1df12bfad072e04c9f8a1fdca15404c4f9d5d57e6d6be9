import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteAppRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAppCommand}.
 */
export interface DeleteAppCommandInput extends DeleteAppRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteAppCommand}.
 */
export interface DeleteAppCommandOutput extends __MetadataBearer {
}
declare const DeleteAppCommand_base: {
    new (input: DeleteAppCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAppCommandInput, DeleteAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAppCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAppCommandInput, DeleteAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Used to stop and delete an app.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteAppRequest
 *   DomainId: "STRING_VALUE", // required
 *   UserProfileName: "STRING_VALUE",
 *   SpaceName: "STRING_VALUE",
 *   AppType: "JupyterServer" || "KernelGateway" || "DetailedProfiler" || "TensorBoard" || "CodeEditor" || "JupyterLab" || "RStudioServerPro" || "RSessionGateway" || "Canvas", // required
 *   AppName: "STRING_VALUE", // required
 * };
 * const command = new DeleteAppCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteAppCommandInput - {@link DeleteAppCommandInput}
 * @returns {@link DeleteAppCommandOutput}
 * @see {@link DeleteAppCommandInput} for command's `input` shape.
 * @see {@link DeleteAppCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class DeleteAppCommand extends DeleteAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAppRequest;
            output: {};
        };
        sdk: {
            input: DeleteAppCommandInput;
            output: DeleteAppCommandOutput;
        };
    };
}
