import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdatePipelineExecutionRequest, UpdatePipelineExecutionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdatePipelineExecutionCommand}.
 */
export interface UpdatePipelineExecutionCommandInput extends UpdatePipelineExecutionRequest {
}
/**
 * @public
 *
 * The output of {@link UpdatePipelineExecutionCommand}.
 */
export interface UpdatePipelineExecutionCommandOutput extends UpdatePipelineExecutionResponse, __MetadataBearer {
}
declare const UpdatePipelineExecutionCommand_base: {
    new (input: UpdatePipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePipelineExecutionCommandInput, UpdatePipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdatePipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePipelineExecutionCommandInput, UpdatePipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a pipeline execution.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdatePipelineExecutionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdatePipelineExecutionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdatePipelineExecutionRequest
 *   PipelineExecutionArn: "STRING_VALUE", // required
 *   PipelineExecutionDescription: "STRING_VALUE",
 *   PipelineExecutionDisplayName: "STRING_VALUE",
 *   ParallelismConfiguration: { // ParallelismConfiguration
 *     MaxParallelExecutionSteps: Number("int"), // required
 *   },
 * };
 * const command = new UpdatePipelineExecutionCommand(input);
 * const response = await client.send(command);
 * // { // UpdatePipelineExecutionResponse
 * //   PipelineExecutionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdatePipelineExecutionCommandInput - {@link UpdatePipelineExecutionCommandInput}
 * @returns {@link UpdatePipelineExecutionCommandOutput}
 * @see {@link UpdatePipelineExecutionCommandInput} for command's `input` shape.
 * @see {@link UpdatePipelineExecutionCommandOutput} for command's `response` shape.
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
export declare class UpdatePipelineExecutionCommand extends UpdatePipelineExecutionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdatePipelineExecutionRequest;
            output: UpdatePipelineExecutionResponse;
        };
        sdk: {
            input: UpdatePipelineExecutionCommandInput;
            output: UpdatePipelineExecutionCommandOutput;
        };
    };
}
