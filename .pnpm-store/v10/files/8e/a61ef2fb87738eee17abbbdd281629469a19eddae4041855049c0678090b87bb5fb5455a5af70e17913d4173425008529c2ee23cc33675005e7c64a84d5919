import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteUserProfileRequest } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteUserProfileCommand}.
 */
export interface DeleteUserProfileCommandInput extends DeleteUserProfileRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteUserProfileCommand}.
 */
export interface DeleteUserProfileCommandOutput extends __MetadataBearer {
}
declare const DeleteUserProfileCommand_base: {
    new (input: DeleteUserProfileCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteUserProfileCommandInput, DeleteUserProfileCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteUserProfileCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteUserProfileCommandInput, DeleteUserProfileCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a user profile. When a user profile is deleted, the user loses access to their EFS volume, including data, notebooks, and other artifacts.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteUserProfileCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteUserProfileCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteUserProfileRequest
 *   DomainId: "STRING_VALUE", // required
 *   UserProfileName: "STRING_VALUE", // required
 * };
 * const command = new DeleteUserProfileCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteUserProfileCommandInput - {@link DeleteUserProfileCommandInput}
 * @returns {@link DeleteUserProfileCommandOutput}
 * @see {@link DeleteUserProfileCommandInput} for command's `input` shape.
 * @see {@link DeleteUserProfileCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class DeleteUserProfileCommand extends DeleteUserProfileCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteUserProfileRequest;
            output: {};
        };
        sdk: {
            input: DeleteUserProfileCommandInput;
            output: DeleteUserProfileCommandOutput;
        };
    };
}
