import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartPipelineExecutionRequest, StartPipelineExecutionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartPipelineExecutionCommand}.
 */
export interface StartPipelineExecutionCommandInput extends StartPipelineExecutionRequest {
}
/**
 * @public
 *
 * The output of {@link StartPipelineExecutionCommand}.
 */
export interface StartPipelineExecutionCommandOutput extends StartPipelineExecutionResponse, __MetadataBearer {
}
declare const StartPipelineExecutionCommand_base: {
    new (input: StartPipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<StartPipelineExecutionCommandInput, StartPipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartPipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<StartPipelineExecutionCommandInput, StartPipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts a pipeline execution.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartPipelineExecutionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartPipelineExecutionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartPipelineExecutionRequest
 *   PipelineName: "STRING_VALUE", // required
 *   PipelineExecutionDisplayName: "STRING_VALUE",
 *   PipelineParameters: [ // ParameterList
 *     { // Parameter
 *       Name: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   PipelineExecutionDescription: "STRING_VALUE",
 *   ClientRequestToken: "STRING_VALUE", // required
 *   ParallelismConfiguration: { // ParallelismConfiguration
 *     MaxParallelExecutionSteps: Number("int"), // required
 *   },
 *   SelectiveExecutionConfig: { // SelectiveExecutionConfig
 *     SourcePipelineExecutionArn: "STRING_VALUE",
 *     SelectedSteps: [ // SelectedStepList // required
 *       { // SelectedStep
 *         StepName: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 *   PipelineVersionId: Number("long"),
 *   MlflowExperimentName: "STRING_VALUE",
 * };
 * const command = new StartPipelineExecutionCommand(input);
 * const response = await client.send(command);
 * // { // StartPipelineExecutionResponse
 * //   PipelineExecutionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param StartPipelineExecutionCommandInput - {@link StartPipelineExecutionCommandInput}
 * @returns {@link StartPipelineExecutionCommandOutput}
 * @see {@link StartPipelineExecutionCommandInput} for command's `input` shape.
 * @see {@link StartPipelineExecutionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class StartPipelineExecutionCommand extends StartPipelineExecutionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartPipelineExecutionRequest;
            output: StartPipelineExecutionResponse;
        };
        sdk: {
            input: StartPipelineExecutionCommandInput;
            output: StartPipelineExecutionCommandOutput;
        };
    };
}
