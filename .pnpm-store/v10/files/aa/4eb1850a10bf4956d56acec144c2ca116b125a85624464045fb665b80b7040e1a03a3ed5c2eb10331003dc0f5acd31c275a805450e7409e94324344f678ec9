import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteWorkteamRequest, DeleteWorkteamResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteWorkteamCommand}.
 */
export interface DeleteWorkteamCommandInput extends DeleteWorkteamRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteWorkteamCommand}.
 */
export interface DeleteWorkteamCommandOutput extends DeleteWorkteamResponse, __MetadataBearer {
}
declare const DeleteWorkteamCommand_base: {
    new (input: DeleteWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteWorkteamCommandInput, DeleteWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteWorkteamCommandInput, DeleteWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an existing work team. This operation can't be undone.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteWorkteamCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteWorkteamCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteWorkteamRequest
 *   WorkteamName: "STRING_VALUE", // required
 * };
 * const command = new DeleteWorkteamCommand(input);
 * const response = await client.send(command);
 * // { // DeleteWorkteamResponse
 * //   Success: true || false, // required
 * // };
 *
 * ```
 *
 * @param DeleteWorkteamCommandInput - {@link DeleteWorkteamCommandInput}
 * @returns {@link DeleteWorkteamCommandOutput}
 * @see {@link DeleteWorkteamCommandInput} for command's `input` shape.
 * @see {@link DeleteWorkteamCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteWorkteamCommand extends DeleteWorkteamCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteWorkteamRequest;
            output: DeleteWorkteamResponse;
        };
        sdk: {
            input: DeleteWorkteamCommandInput;
            output: DeleteWorkteamCommandOutput;
        };
    };
}
