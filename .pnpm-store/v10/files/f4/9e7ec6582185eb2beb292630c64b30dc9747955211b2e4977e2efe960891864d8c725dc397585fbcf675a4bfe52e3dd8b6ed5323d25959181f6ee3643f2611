import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateTrialRequest, UpdateTrialResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateTrialCommand}.
 */
export interface UpdateTrialCommandInput extends UpdateTrialRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateTrialCommand}.
 */
export interface UpdateTrialCommandOutput extends UpdateTrialResponse, __MetadataBearer {
}
declare const UpdateTrialCommand_base: {
    new (input: UpdateTrialCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateTrialCommandInput, UpdateTrialCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateTrialCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateTrialCommandInput, UpdateTrialCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the display name of a trial.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateTrialCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateTrialCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateTrialRequest
 *   TrialName: "STRING_VALUE", // required
 *   DisplayName: "STRING_VALUE",
 * };
 * const command = new UpdateTrialCommand(input);
 * const response = await client.send(command);
 * // { // UpdateTrialResponse
 * //   TrialArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateTrialCommandInput - {@link UpdateTrialCommandInput}
 * @returns {@link UpdateTrialCommandOutput}
 * @see {@link UpdateTrialCommandInput} for command's `input` shape.
 * @see {@link UpdateTrialCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class UpdateTrialCommand extends UpdateTrialCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateTrialRequest;
            output: UpdateTrialResponse;
        };
        sdk: {
            input: UpdateTrialCommandInput;
            output: UpdateTrialCommandOutput;
        };
    };
}
