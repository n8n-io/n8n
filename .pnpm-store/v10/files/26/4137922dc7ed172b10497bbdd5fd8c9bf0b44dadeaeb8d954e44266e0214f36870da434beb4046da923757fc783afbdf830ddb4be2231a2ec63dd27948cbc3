import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateActionRequest, UpdateActionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateActionCommand}.
 */
export interface UpdateActionCommandInput extends UpdateActionRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateActionCommand}.
 */
export interface UpdateActionCommandOutput extends UpdateActionResponse, __MetadataBearer {
}
declare const UpdateActionCommand_base: {
    new (input: UpdateActionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateActionCommandInput, UpdateActionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateActionCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateActionCommandInput, UpdateActionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an action.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateActionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateActionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateActionRequest
 *   ActionName: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   Status: "Unknown" || "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *   Properties: { // LineageEntityParameters
 *     "<keys>": "STRING_VALUE",
 *   },
 *   PropertiesToRemove: [ // ListLineageEntityParameterKey
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UpdateActionCommand(input);
 * const response = await client.send(command);
 * // { // UpdateActionResponse
 * //   ActionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateActionCommandInput - {@link UpdateActionCommandInput}
 * @returns {@link UpdateActionCommandOutput}
 * @see {@link UpdateActionCommandInput} for command's `input` shape.
 * @see {@link UpdateActionCommandOutput} for command's `response` shape.
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
export declare class UpdateActionCommand extends UpdateActionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateActionRequest;
            output: UpdateActionResponse;
        };
        sdk: {
            input: UpdateActionCommandInput;
            output: UpdateActionCommandOutput;
        };
    };
}
