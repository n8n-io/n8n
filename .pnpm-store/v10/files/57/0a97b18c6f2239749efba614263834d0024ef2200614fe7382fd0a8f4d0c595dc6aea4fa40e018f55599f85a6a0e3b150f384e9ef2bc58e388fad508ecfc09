import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteAssociationRequest, DeleteAssociationResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAssociationCommand}.
 */
export interface DeleteAssociationCommandInput extends DeleteAssociationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteAssociationCommand}.
 */
export interface DeleteAssociationCommandOutput extends DeleteAssociationResponse, __MetadataBearer {
}
declare const DeleteAssociationCommand_base: {
    new (input: DeleteAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAssociationCommandInput, DeleteAssociationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAssociationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAssociationCommandInput, DeleteAssociationCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an association.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteAssociationCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteAssociationCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteAssociationRequest
 *   SourceArn: "STRING_VALUE", // required
 *   DestinationArn: "STRING_VALUE", // required
 * };
 * const command = new DeleteAssociationCommand(input);
 * const response = await client.send(command);
 * // { // DeleteAssociationResponse
 * //   SourceArn: "STRING_VALUE",
 * //   DestinationArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeleteAssociationCommandInput - {@link DeleteAssociationCommandInput}
 * @returns {@link DeleteAssociationCommandOutput}
 * @see {@link DeleteAssociationCommandInput} for command's `input` shape.
 * @see {@link DeleteAssociationCommandOutput} for command's `response` shape.
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
export declare class DeleteAssociationCommand extends DeleteAssociationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAssociationRequest;
            output: DeleteAssociationResponse;
        };
        sdk: {
            input: DeleteAssociationCommandInput;
            output: DeleteAssociationCommandOutput;
        };
    };
}
