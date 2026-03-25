import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribePipelineExecutionRequest, DescribePipelineExecutionResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribePipelineExecutionCommand}.
 */
export interface DescribePipelineExecutionCommandInput extends DescribePipelineExecutionRequest {
}
/**
 * @public
 *
 * The output of {@link DescribePipelineExecutionCommand}.
 */
export interface DescribePipelineExecutionCommandOutput extends DescribePipelineExecutionResponse, __MetadataBearer {
}
declare const DescribePipelineExecutionCommand_base: {
    new (input: DescribePipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePipelineExecutionCommandInput, DescribePipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribePipelineExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePipelineExecutionCommandInput, DescribePipelineExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes the details of a pipeline execution.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribePipelineExecutionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribePipelineExecutionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribePipelineExecutionRequest
 *   PipelineExecutionArn: "STRING_VALUE", // required
 * };
 * const command = new DescribePipelineExecutionCommand(input);
 * const response = await client.send(command);
 * // { // DescribePipelineExecutionResponse
 * //   PipelineArn: "STRING_VALUE",
 * //   PipelineExecutionArn: "STRING_VALUE",
 * //   PipelineExecutionDisplayName: "STRING_VALUE",
 * //   PipelineExecutionStatus: "Executing" || "Stopping" || "Stopped" || "Failed" || "Succeeded",
 * //   PipelineExecutionDescription: "STRING_VALUE",
 * //   PipelineExperimentConfig: { // PipelineExperimentConfig
 * //     ExperimentName: "STRING_VALUE",
 * //     TrialName: "STRING_VALUE",
 * //   },
 * //   FailureReason: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   CreatedBy: { // UserContext
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: { // IamIdentity
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * //   LastModifiedBy: {
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: {
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * //   ParallelismConfiguration: { // ParallelismConfiguration
 * //     MaxParallelExecutionSteps: Number("int"), // required
 * //   },
 * //   SelectiveExecutionConfig: { // SelectiveExecutionConfig
 * //     SourcePipelineExecutionArn: "STRING_VALUE",
 * //     SelectedSteps: [ // SelectedStepList // required
 * //       { // SelectedStep
 * //         StepName: "STRING_VALUE", // required
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribePipelineExecutionCommandInput - {@link DescribePipelineExecutionCommandInput}
 * @returns {@link DescribePipelineExecutionCommandOutput}
 * @see {@link DescribePipelineExecutionCommandInput} for command's `input` shape.
 * @see {@link DescribePipelineExecutionCommandOutput} for command's `response` shape.
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
export declare class DescribePipelineExecutionCommand extends DescribePipelineExecutionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribePipelineExecutionRequest;
            output: DescribePipelineExecutionResponse;
        };
        sdk: {
            input: DescribePipelineExecutionCommandInput;
            output: DescribePipelineExecutionCommandOutput;
        };
    };
}
