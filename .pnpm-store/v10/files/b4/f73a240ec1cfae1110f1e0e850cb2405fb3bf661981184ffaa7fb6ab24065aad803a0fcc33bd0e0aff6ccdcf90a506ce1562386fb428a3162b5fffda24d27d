import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListPipelineParametersForExecutionRequest, ListPipelineParametersForExecutionResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListPipelineParametersForExecutionCommand}.
 */
export interface ListPipelineParametersForExecutionCommandInput extends ListPipelineParametersForExecutionRequest {
}
/**
 * @public
 *
 * The output of {@link ListPipelineParametersForExecutionCommand}.
 */
export interface ListPipelineParametersForExecutionCommandOutput extends ListPipelineParametersForExecutionResponse, __MetadataBearer {
}
declare const ListPipelineParametersForExecutionCommand_base: {
    new (input: ListPipelineParametersForExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineParametersForExecutionCommandInput, ListPipelineParametersForExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListPipelineParametersForExecutionCommandInput): import("@smithy/smithy-client").CommandImpl<ListPipelineParametersForExecutionCommandInput, ListPipelineParametersForExecutionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of parameters for a pipeline execution.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListPipelineParametersForExecutionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListPipelineParametersForExecutionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListPipelineParametersForExecutionRequest
 *   PipelineExecutionArn: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListPipelineParametersForExecutionCommand(input);
 * const response = await client.send(command);
 * // { // ListPipelineParametersForExecutionResponse
 * //   PipelineParameters: [ // ParameterList
 * //     { // Parameter
 * //       Name: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListPipelineParametersForExecutionCommandInput - {@link ListPipelineParametersForExecutionCommandInput}
 * @returns {@link ListPipelineParametersForExecutionCommandOutput}
 * @see {@link ListPipelineParametersForExecutionCommandInput} for command's `input` shape.
 * @see {@link ListPipelineParametersForExecutionCommandOutput} for command's `response` shape.
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
export declare class ListPipelineParametersForExecutionCommand extends ListPipelineParametersForExecutionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListPipelineParametersForExecutionRequest;
            output: ListPipelineParametersForExecutionResponse;
        };
        sdk: {
            input: ListPipelineParametersForExecutionCommandInput;
            output: ListPipelineParametersForExecutionCommandOutput;
        };
    };
}
