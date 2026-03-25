import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateContextRequest, UpdateContextResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateContextCommand}.
 */
export interface UpdateContextCommandInput extends UpdateContextRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateContextCommand}.
 */
export interface UpdateContextCommandOutput extends UpdateContextResponse, __MetadataBearer {
}
declare const UpdateContextCommand_base: {
    new (input: UpdateContextCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateContextCommandInput, UpdateContextCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateContextCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateContextCommandInput, UpdateContextCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a context.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateContextCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateContextCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateContextRequest
 *   ContextName: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   Properties: { // LineageEntityParameters
 *     "<keys>": "STRING_VALUE",
 *   },
 *   PropertiesToRemove: [ // ListLineageEntityParameterKey
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UpdateContextCommand(input);
 * const response = await client.send(command);
 * // { // UpdateContextResponse
 * //   ContextArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateContextCommandInput - {@link UpdateContextCommandInput}
 * @returns {@link UpdateContextCommandOutput}
 * @see {@link UpdateContextCommandInput} for command's `input` shape.
 * @see {@link UpdateContextCommandOutput} for command's `response` shape.
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
export declare class UpdateContextCommand extends UpdateContextCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateContextRequest;
            output: UpdateContextResponse;
        };
        sdk: {
            input: UpdateContextCommandInput;
            output: UpdateContextCommandOutput;
        };
    };
}
