import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateExperimentRequest, UpdateExperimentResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateExperimentCommand}.
 */
export interface UpdateExperimentCommandInput extends UpdateExperimentRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateExperimentCommand}.
 */
export interface UpdateExperimentCommandOutput extends UpdateExperimentResponse, __MetadataBearer {
}
declare const UpdateExperimentCommand_base: {
    new (input: UpdateExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateExperimentCommandInput, UpdateExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateExperimentCommandInput, UpdateExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Adds, updates, or removes the description of an experiment. Updates the display name of an experiment.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateExperimentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateExperimentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateExperimentRequest
 *   ExperimentName: "STRING_VALUE", // required
 *   DisplayName: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 * };
 * const command = new UpdateExperimentCommand(input);
 * const response = await client.send(command);
 * // { // UpdateExperimentResponse
 * //   ExperimentArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateExperimentCommandInput - {@link UpdateExperimentCommandInput}
 * @returns {@link UpdateExperimentCommandOutput}
 * @see {@link UpdateExperimentCommandInput} for command's `input` shape.
 * @see {@link UpdateExperimentCommandOutput} for command's `response` shape.
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
export declare class UpdateExperimentCommand extends UpdateExperimentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateExperimentRequest;
            output: UpdateExperimentResponse;
        };
        sdk: {
            input: UpdateExperimentCommandInput;
            output: UpdateExperimentCommandOutput;
        };
    };
}
