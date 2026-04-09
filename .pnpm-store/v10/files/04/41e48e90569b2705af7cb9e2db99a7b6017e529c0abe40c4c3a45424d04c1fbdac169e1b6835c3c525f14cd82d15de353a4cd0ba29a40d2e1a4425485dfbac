import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdatePipelineVersionRequest, UpdatePipelineVersionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdatePipelineVersionCommand}.
 */
export interface UpdatePipelineVersionCommandInput extends UpdatePipelineVersionRequest {
}
/**
 * @public
 *
 * The output of {@link UpdatePipelineVersionCommand}.
 */
export interface UpdatePipelineVersionCommandOutput extends UpdatePipelineVersionResponse, __MetadataBearer {
}
declare const UpdatePipelineVersionCommand_base: {
    new (input: UpdatePipelineVersionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePipelineVersionCommandInput, UpdatePipelineVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdatePipelineVersionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePipelineVersionCommandInput, UpdatePipelineVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a pipeline version.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdatePipelineVersionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdatePipelineVersionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdatePipelineVersionRequest
 *   PipelineArn: "STRING_VALUE", // required
 *   PipelineVersionId: Number("long"), // required
 *   PipelineVersionDisplayName: "STRING_VALUE",
 *   PipelineVersionDescription: "STRING_VALUE",
 * };
 * const command = new UpdatePipelineVersionCommand(input);
 * const response = await client.send(command);
 * // { // UpdatePipelineVersionResponse
 * //   PipelineArn: "STRING_VALUE",
 * //   PipelineVersionId: Number("long"),
 * // };
 *
 * ```
 *
 * @param UpdatePipelineVersionCommandInput - {@link UpdatePipelineVersionCommandInput}
 * @returns {@link UpdatePipelineVersionCommandOutput}
 * @see {@link UpdatePipelineVersionCommandInput} for command's `input` shape.
 * @see {@link UpdatePipelineVersionCommandOutput} for command's `response` shape.
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
export declare class UpdatePipelineVersionCommand extends UpdatePipelineVersionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdatePipelineVersionRequest;
            output: UpdatePipelineVersionResponse;
        };
        sdk: {
            input: UpdatePipelineVersionCommandInput;
            output: UpdatePipelineVersionCommandOutput;
        };
    };
}
