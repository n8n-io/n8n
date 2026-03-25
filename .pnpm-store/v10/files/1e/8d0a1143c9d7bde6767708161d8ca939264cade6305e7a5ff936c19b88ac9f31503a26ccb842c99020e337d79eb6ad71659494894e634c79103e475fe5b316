import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeletePipelineRequest, DeletePipelineResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeletePipelineCommand}.
 */
export interface DeletePipelineCommandInput extends DeletePipelineRequest {
}
/**
 * @public
 *
 * The output of {@link DeletePipelineCommand}.
 */
export interface DeletePipelineCommandOutput extends DeletePipelineResponse, __MetadataBearer {
}
declare const DeletePipelineCommand_base: {
    new (input: DeletePipelineCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePipelineCommandInput, DeletePipelineCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeletePipelineCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePipelineCommandInput, DeletePipelineCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a pipeline if there are no running instances of the pipeline. To delete a pipeline, you must stop all running instances of the pipeline using the <code>StopPipelineExecution</code> API. When you delete a pipeline, all instances of the pipeline are deleted.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeletePipelineCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeletePipelineCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeletePipelineRequest
 *   PipelineName: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE", // required
 * };
 * const command = new DeletePipelineCommand(input);
 * const response = await client.send(command);
 * // { // DeletePipelineResponse
 * //   PipelineArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeletePipelineCommandInput - {@link DeletePipelineCommandInput}
 * @returns {@link DeletePipelineCommandOutput}
 * @see {@link DeletePipelineCommandInput} for command's `input` shape.
 * @see {@link DeletePipelineCommandOutput} for command's `response` shape.
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
export declare class DeletePipelineCommand extends DeletePipelineCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeletePipelineRequest;
            output: DeletePipelineResponse;
        };
        sdk: {
            input: DeletePipelineCommandInput;
            output: DeletePipelineCommandOutput;
        };
    };
}
