import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListProcessingJobsRequest, ListProcessingJobsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListProcessingJobsCommand}.
 */
export interface ListProcessingJobsCommandInput extends ListProcessingJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListProcessingJobsCommand}.
 */
export interface ListProcessingJobsCommandOutput extends ListProcessingJobsResponse, __MetadataBearer {
}
declare const ListProcessingJobsCommand_base: {
    new (input: ListProcessingJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListProcessingJobsCommandInput, ListProcessingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListProcessingJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListProcessingJobsCommandInput, ListProcessingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists processing jobs that satisfy various filters.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListProcessingJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListProcessingJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListProcessingJobsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListProcessingJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListProcessingJobsResponse
 * //   ProcessingJobSummaries: [ // ProcessingJobSummaries // required
 * //     { // ProcessingJobSummary
 * //       ProcessingJobName: "STRING_VALUE", // required
 * //       ProcessingJobArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       ProcessingEndTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       ProcessingJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //       FailureReason: "STRING_VALUE",
 * //       ExitMessage: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListProcessingJobsCommandInput - {@link ListProcessingJobsCommandInput}
 * @returns {@link ListProcessingJobsCommandOutput}
 * @see {@link ListProcessingJobsCommandInput} for command's `input` shape.
 * @see {@link ListProcessingJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListProcessingJobsCommand extends ListProcessingJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListProcessingJobsRequest;
            output: ListProcessingJobsResponse;
        };
        sdk: {
            input: ListProcessingJobsCommandInput;
            output: ListProcessingJobsCommandOutput;
        };
    };
}
