import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListLabelingJobsRequest, ListLabelingJobsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListLabelingJobsCommand}.
 */
export interface ListLabelingJobsCommandInput extends ListLabelingJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListLabelingJobsCommand}.
 */
export interface ListLabelingJobsCommandOutput extends ListLabelingJobsResponse, __MetadataBearer {
}
declare const ListLabelingJobsCommand_base: {
    new (input: ListLabelingJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListLabelingJobsCommandInput, ListLabelingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListLabelingJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListLabelingJobsCommandInput, ListLabelingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of labeling jobs.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListLabelingJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListLabelingJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListLabelingJobsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 *   NameContains: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   StatusEquals: "Initializing" || "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * };
 * const command = new ListLabelingJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListLabelingJobsResponse
 * //   LabelingJobSummaryList: [ // LabelingJobSummaryList
 * //     { // LabelingJobSummary
 * //       LabelingJobName: "STRING_VALUE", // required
 * //       LabelingJobArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       LabelingJobStatus: "Initializing" || "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //       LabelCounters: { // LabelCounters
 * //         TotalLabeled: Number("int"),
 * //         HumanLabeled: Number("int"),
 * //         MachineLabeled: Number("int"),
 * //         FailedNonRetryableError: Number("int"),
 * //         Unlabeled: Number("int"),
 * //       },
 * //       WorkteamArn: "STRING_VALUE", // required
 * //       PreHumanTaskLambdaArn: "STRING_VALUE",
 * //       AnnotationConsolidationLambdaArn: "STRING_VALUE",
 * //       FailureReason: "STRING_VALUE",
 * //       LabelingJobOutput: { // LabelingJobOutput
 * //         OutputDatasetS3Uri: "STRING_VALUE", // required
 * //         FinalActiveLearningModelArn: "STRING_VALUE",
 * //       },
 * //       InputConfig: { // LabelingJobInputConfig
 * //         DataSource: { // LabelingJobDataSource
 * //           S3DataSource: { // LabelingJobS3DataSource
 * //             ManifestS3Uri: "STRING_VALUE", // required
 * //           },
 * //           SnsDataSource: { // LabelingJobSnsDataSource
 * //             SnsTopicArn: "STRING_VALUE", // required
 * //           },
 * //         },
 * //         DataAttributes: { // LabelingJobDataAttributes
 * //           ContentClassifiers: [ // ContentClassifiers
 * //             "FreeOfPersonallyIdentifiableInformation" || "FreeOfAdultContent",
 * //           ],
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListLabelingJobsCommandInput - {@link ListLabelingJobsCommandInput}
 * @returns {@link ListLabelingJobsCommandOutput}
 * @see {@link ListLabelingJobsCommandInput} for command's `input` shape.
 * @see {@link ListLabelingJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListLabelingJobsCommand extends ListLabelingJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListLabelingJobsRequest;
            output: ListLabelingJobsResponse;
        };
        sdk: {
            input: ListLabelingJobsCommandInput;
            output: ListLabelingJobsCommandOutput;
        };
    };
}
