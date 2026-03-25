import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteEndpointConfigInput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteEndpointConfigCommand}.
 */
export interface DeleteEndpointConfigCommandInput extends DeleteEndpointConfigInput {
}
/**
 * @public
 *
 * The output of {@link DeleteEndpointConfigCommand}.
 */
export interface DeleteEndpointConfigCommandOutput extends __MetadataBearer {
}
declare const DeleteEndpointConfigCommand_base: {
    new (input: DeleteEndpointConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEndpointConfigCommandInput, DeleteEndpointConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteEndpointConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteEndpointConfigCommandInput, DeleteEndpointConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an endpoint configuration. The <code>DeleteEndpointConfig</code> API deletes only the specified configuration. It does not delete endpoints created using the configuration. </p> <p>You must not delete an <code>EndpointConfig</code> in use by an endpoint that is live or while the <code>UpdateEndpoint</code> or <code>CreateEndpoint</code> operations are being performed on the endpoint. If you delete the <code>EndpointConfig</code> of an endpoint that is active or being created or updated you may lose visibility into the instance type the endpoint is using. The endpoint must be deleted in order to stop incurring charges.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteEndpointConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteEndpointConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DeleteEndpointConfigInput
 *   EndpointConfigName: "STRING_VALUE", // required
 * };
 * const command = new DeleteEndpointConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteEndpointConfigCommandInput - {@link DeleteEndpointConfigCommandInput}
 * @returns {@link DeleteEndpointConfigCommandOutput}
 * @see {@link DeleteEndpointConfigCommandInput} for command's `input` shape.
 * @see {@link DeleteEndpointConfigCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteEndpointConfigCommand extends DeleteEndpointConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteEndpointConfigInput;
            output: {};
        };
        sdk: {
            input: DeleteEndpointConfigCommandInput;
            output: DeleteEndpointConfigCommandOutput;
        };
    };
}
