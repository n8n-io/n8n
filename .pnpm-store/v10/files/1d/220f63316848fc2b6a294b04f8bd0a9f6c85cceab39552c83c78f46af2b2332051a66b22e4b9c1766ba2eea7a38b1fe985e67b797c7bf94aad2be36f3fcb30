import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListTrainingJobsForHyperParameterTuningJobRequest, ListTrainingJobsForHyperParameterTuningJobResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTrainingJobsForHyperParameterTuningJobCommand}.
 */
export interface ListTrainingJobsForHyperParameterTuningJobCommandInput extends ListTrainingJobsForHyperParameterTuningJobRequest {
}
/**
 * @public
 *
 * The output of {@link ListTrainingJobsForHyperParameterTuningJobCommand}.
 */
export interface ListTrainingJobsForHyperParameterTuningJobCommandOutput extends ListTrainingJobsForHyperParameterTuningJobResponse, __MetadataBearer {
}
declare const ListTrainingJobsForHyperParameterTuningJobCommand_base: {
    new (input: ListTrainingJobsForHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<ListTrainingJobsForHyperParameterTuningJobCommandInput, ListTrainingJobsForHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListTrainingJobsForHyperParameterTuningJobCommandInput): import("@smithy/smithy-client").CommandImpl<ListTrainingJobsForHyperParameterTuningJobCommandInput, ListTrainingJobsForHyperParameterTuningJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_TrainingJobSummary.html">TrainingJobSummary</a> objects that describe the training jobs that a hyperparameter tuning job launched.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListTrainingJobsForHyperParameterTuningJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListTrainingJobsForHyperParameterTuningJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListTrainingJobsForHyperParameterTuningJobRequest
 *   HyperParameterTuningJobName: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   StatusEquals: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped" || "Deleting",
 *   SortBy: "Name" || "CreationTime" || "Status" || "FinalObjectiveMetricValue",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListTrainingJobsForHyperParameterTuningJobCommand(input);
 * const response = await client.send(command);
 * // { // ListTrainingJobsForHyperParameterTuningJobResponse
 * //   TrainingJobSummaries: [ // HyperParameterTrainingJobSummaries // required
 * //     { // HyperParameterTrainingJobSummary
 * //       TrainingJobDefinitionName: "STRING_VALUE",
 * //       TrainingJobName: "STRING_VALUE", // required
 * //       TrainingJobArn: "STRING_VALUE", // required
 * //       TuningJobName: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       TrainingStartTime: new Date("TIMESTAMP"),
 * //       TrainingEndTime: new Date("TIMESTAMP"),
 * //       TrainingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped" || "Deleting", // required
 * //       TunedHyperParameters: { // HyperParameters // required
 * //         "<keys>": "STRING_VALUE",
 * //       },
 * //       FailureReason: "STRING_VALUE",
 * //       FinalHyperParameterTuningJobObjectiveMetric: { // FinalHyperParameterTuningJobObjectiveMetric
 * //         Type: "Maximize" || "Minimize",
 * //         MetricName: "STRING_VALUE", // required
 * //         Value: Number("float"), // required
 * //       },
 * //       ObjectiveStatus: "Succeeded" || "Pending" || "Failed",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTrainingJobsForHyperParameterTuningJobCommandInput - {@link ListTrainingJobsForHyperParameterTuningJobCommandInput}
 * @returns {@link ListTrainingJobsForHyperParameterTuningJobCommandOutput}
 * @see {@link ListTrainingJobsForHyperParameterTuningJobCommandInput} for command's `input` shape.
 * @see {@link ListTrainingJobsForHyperParameterTuningJobCommandOutput} for command's `response` shape.
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
export declare class ListTrainingJobsForHyperParameterTuningJobCommand extends ListTrainingJobsForHyperParameterTuningJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTrainingJobsForHyperParameterTuningJobRequest;
            output: ListTrainingJobsForHyperParameterTuningJobResponse;
        };
        sdk: {
            input: ListTrainingJobsForHyperParameterTuningJobCommandInput;
            output: ListTrainingJobsForHyperParameterTuningJobCommandOutput;
        };
    };
}
