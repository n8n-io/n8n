import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeletePartnerAppRequest, DeletePartnerAppResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeletePartnerAppCommand}.
 */
export interface DeletePartnerAppCommandInput extends DeletePartnerAppRequest {
}
/**
 * @public
 *
 * The output of {@link DeletePartnerAppCommand}.
 */
export interface DeletePartnerAppCommandOutput extends DeletePartnerAppResponse, __MetadataBearer {
}
declare const DeletePartnerAppCommand_base: {
    new (input: DeletePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePartnerAppCommandInput, DeletePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeletePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<DeletePartnerAppCommandInput, DeletePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a SageMaker Partner AI App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeletePartnerAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeletePartnerAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeletePartnerAppRequest
 *   Arn: "STRING_VALUE", // required
 *   ClientToken: "STRING_VALUE",
 * };
 * const command = new DeletePartnerAppCommand(input);
 * const response = await client.send(command);
 * // { // DeletePartnerAppResponse
 * //   Arn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DeletePartnerAppCommandInput - {@link DeletePartnerAppCommandInput}
 * @returns {@link DeletePartnerAppCommandOutput}
 * @see {@link DeletePartnerAppCommandInput} for command's `input` shape.
 * @see {@link DeletePartnerAppCommandOutput} for command's `response` shape.
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
export declare class DeletePartnerAppCommand extends DeletePartnerAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeletePartnerAppRequest;
            output: DeletePartnerAppResponse;
        };
        sdk: {
            input: DeletePartnerAppCommandInput;
            output: DeletePartnerAppCommandOutput;
        };
    };
}
