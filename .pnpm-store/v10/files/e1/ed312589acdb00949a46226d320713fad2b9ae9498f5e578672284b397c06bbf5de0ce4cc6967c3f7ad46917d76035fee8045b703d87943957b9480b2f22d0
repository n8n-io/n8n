import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListPipelineExecutionsRequest, ListPipelineExecutionsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListPipelineExecutionsCommand}.
 */
export interface ListPipelineExecutionsCommandInput extends ListPipelineExecutionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListPipelineExecutionsCommand}.
 */
export interface ListPipelineExecutionsCommandOutput extends ListPipelineExecutionsResponse, __MetadataBearer {
}
declare const ListPipelineExecutionsCommand_base: {
    new (input: ListPipelineExecutionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineExecutionsCommandInput, ListPipelineExecutionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListPipelineExecutionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineExecutionsCommandInput, ListPipelineExecutionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of the pipeline executions.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListPipelineExecutionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListPipelineExecutionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListPipelineExecutionsRequest
 *   PipelineName: "STRING_VALUE", // required
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "CreationTime" || "PipelineExecutionArn",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListPipelineExecutionsCommand(input);
 * const response = await client.send(command);
 * // { // ListPipelineExecutionsResponse
 * //   PipelineExecutionSummaries: [ // PipelineExecutionSummaryList
 * //     { // PipelineExecutionSummary
 * //       PipelineExecutionArn: "STRING_VALUE",
 * //       StartTime: new Date("TIMESTAMP"),
 * //       PipelineExecutionStatus: "Executing" || "Stopping" || "Stopped" || "Failed" || "Succeeded",
 * //       PipelineExecutionDescription: "STRING_VALUE",
 * //       PipelineExecutionDisplayName: "STRING_VALUE",
 * //       PipelineExecutionFailureReason: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListPipelineExecutionsCommandInput - {@link ListPipelineExecutionsCommandInput}
 * @returns {@link ListPipelineExecutionsCommandOutput}
 * @see {@link ListPipelineExecutionsCommandInput} for command's `input` shape.
 * @see {@link ListPipelineExecutionsCommandOutput} for command's `response` shape.
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
export declare class ListPipelineExecutionsCommand extends ListPipelineExecutionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListPipelineExecutionsRequest;
            output: ListPipelineExecutionsResponse;
        };
        sdk: {
            input: ListPipelineExecutionsCommandInput;
            output: ListPipelineExecutionsCommandOutput;
        };
    };
}
