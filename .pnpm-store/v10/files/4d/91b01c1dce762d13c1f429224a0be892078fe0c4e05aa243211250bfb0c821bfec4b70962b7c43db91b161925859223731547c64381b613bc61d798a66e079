import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateTrialComponentRequest, UpdateTrialComponentResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateTrialComponentCommand}.
 */
export interface UpdateTrialComponentCommandInput extends UpdateTrialComponentRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateTrialComponentCommand}.
 */
export interface UpdateTrialComponentCommandOutput extends UpdateTrialComponentResponse, __MetadataBearer {
}
declare const UpdateTrialComponentCommand_base: {
    new (input: UpdateTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateTrialComponentCommandInput, UpdateTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateTrialComponentCommandInput, UpdateTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates one or more properties of a trial component.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateTrialComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateTrialComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateTrialComponentRequest
 *   TrialComponentName: "STRING_VALUE", // required
 *   DisplayName: "STRING_VALUE",
 *   Status: { // TrialComponentStatus
 *     PrimaryStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *     Message: "STRING_VALUE",
 *   },
 *   StartTime: new Date("TIMESTAMP"),
 *   EndTime: new Date("TIMESTAMP"),
 *   Parameters: { // TrialComponentParameters
 *     "<keys>": { // TrialComponentParameterValue Union: only one key present
 *       StringValue: "STRING_VALUE",
 *       NumberValue: Number("double"),
 *     },
 *   },
 *   ParametersToRemove: [ // ListTrialComponentKey256
 *     "STRING_VALUE",
 *   ],
 *   InputArtifacts: { // TrialComponentArtifacts
 *     "<keys>": { // TrialComponentArtifact
 *       MediaType: "STRING_VALUE",
 *       Value: "STRING_VALUE", // required
 *     },
 *   },
 *   InputArtifactsToRemove: [
 *     "STRING_VALUE",
 *   ],
 *   OutputArtifacts: {
 *     "<keys>": {
 *       MediaType: "STRING_VALUE",
 *       Value: "STRING_VALUE", // required
 *     },
 *   },
 *   OutputArtifactsToRemove: [
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UpdateTrialComponentCommand(input);
 * const response = await client.send(command);
 * // { // UpdateTrialComponentResponse
 * //   TrialComponentArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateTrialComponentCommandInput - {@link UpdateTrialComponentCommandInput}
 * @returns {@link UpdateTrialComponentCommandOutput}
 * @see {@link UpdateTrialComponentCommandInput} for command's `input` shape.
 * @see {@link UpdateTrialComponentCommandOutput} for command's `response` shape.
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
export declare class UpdateTrialComponentCommand extends UpdateTrialComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateTrialComponentRequest;
            output: UpdateTrialComponentResponse;
        };
        sdk: {
            input: UpdateTrialComponentCommandInput;
            output: UpdateTrialComponentCommandOutput;
        };
    };
}
