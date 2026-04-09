import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListPipelineVersionsRequest, ListPipelineVersionsResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListPipelineVersionsCommand}.
 */
export interface ListPipelineVersionsCommandInput extends ListPipelineVersionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListPipelineVersionsCommand}.
 */
export interface ListPipelineVersionsCommandOutput extends ListPipelineVersionsResponse, __MetadataBearer {
}
declare const ListPipelineVersionsCommand_base: {
    new (input: ListPipelineVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineVersionsCommandInput, ListPipelineVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListPipelineVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineVersionsCommandInput, ListPipelineVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of all versions of the pipeline.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListPipelineVersionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListPipelineVersionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListPipelineVersionsRequest
 *   PipelineName: "STRING_VALUE", // required
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListPipelineVersionsCommand(input);
 * const response = await client.send(command);
 * // { // ListPipelineVersionsResponse
 * //   PipelineVersionSummaries: [ // PipelineVersionSummaryList
 * //     { // PipelineVersionSummary
 * //       PipelineArn: "STRING_VALUE",
 * //       PipelineVersionId: Number("long"),
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       PipelineVersionDescription: "STRING_VALUE",
 * //       PipelineVersionDisplayName: "STRING_VALUE",
 * //       LastExecutionPipelineExecutionArn: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListPipelineVersionsCommandInput - {@link ListPipelineVersionsCommandInput}
 * @returns {@link ListPipelineVersionsCommandOutput}
 * @see {@link ListPipelineVersionsCommandInput} for command's `input` shape.
 * @see {@link ListPipelineVersionsCommandOutput} for command's `response` shape.
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
export declare class ListPipelineVersionsCommand extends ListPipelineVersionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListPipelineVersionsRequest;
            output: ListPipelineVersionsResponse;
        };
        sdk: {
            input: ListPipelineVersionsCommandInput;
            output: ListPipelineVersionsCommandOutput;
        };
    };
}
