import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAutoMLJobsRequest, ListAutoMLJobsResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListAutoMLJobsCommand}.
 */
export interface ListAutoMLJobsCommandInput extends ListAutoMLJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListAutoMLJobsCommand}.
 */
export interface ListAutoMLJobsCommandOutput extends ListAutoMLJobsResponse, __MetadataBearer {
}
declare const ListAutoMLJobsCommand_base: {
    new (input: ListAutoMLJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListAutoMLJobsCommandInput, ListAutoMLJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListAutoMLJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListAutoMLJobsCommandInput, ListAutoMLJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Request a list of jobs.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListAutoMLJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListAutoMLJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListAutoMLJobsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping",
 *   SortOrder: "Ascending" || "Descending",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListAutoMLJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListAutoMLJobsResponse
 * //   AutoMLJobSummaries: [ // AutoMLJobSummaries // required
 * //     { // AutoMLJobSummary
 * //       AutoMLJobName: "STRING_VALUE", // required
 * //       AutoMLJobArn: "STRING_VALUE", // required
 * //       AutoMLJobStatus: "Completed" || "InProgress" || "Failed" || "Stopped" || "Stopping", // required
 * //       AutoMLJobSecondaryStatus: "Starting" || "MaxCandidatesReached" || "Failed" || "Stopped" || "MaxAutoMLJobRuntimeReached" || "Stopping" || "CandidateDefinitionsGenerated" || "Completed" || "ExplainabilityError" || "DeployingModel" || "ModelDeploymentError" || "GeneratingModelInsightsReport" || "ModelInsightsError" || "AnalyzingData" || "FeatureEngineering" || "ModelTuning" || "GeneratingExplainabilityReport" || "TrainingModels" || "PreTraining", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       EndTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       FailureReason: "STRING_VALUE",
 * //       PartialFailureReasons: [ // AutoMLPartialFailureReasons
 * //         { // AutoMLPartialFailureReason
 * //           PartialFailureMessage: "STRING_VALUE",
 * //         },
 * //       ],
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListAutoMLJobsCommandInput - {@link ListAutoMLJobsCommandInput}
 * @returns {@link ListAutoMLJobsCommandOutput}
 * @see {@link ListAutoMLJobsCommandInput} for command's `input` shape.
 * @see {@link ListAutoMLJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListAutoMLJobsCommand extends ListAutoMLJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListAutoMLJobsRequest;
            output: ListAutoMLJobsResponse;
        };
        sdk: {
            input: ListAutoMLJobsCommandInput;
            output: ListAutoMLJobsCommandOutput;
        };
    };
}
