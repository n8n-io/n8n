import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteDeviceFleetRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteDeviceFleetCommand}.
 */
export interface DeleteDeviceFleetCommandInput extends DeleteDeviceFleetRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteDeviceFleetCommand}.
 */
export interface DeleteDeviceFleetCommandOutput extends __MetadataBearer {
}
declare const DeleteDeviceFleetCommand_base: {
    new (input: DeleteDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDeviceFleetCommandInput, DeleteDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDeviceFleetCommandInput, DeleteDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a fleet.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteDeviceFleetCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteDeviceFleetCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteDeviceFleetRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 * };
 * const command = new DeleteDeviceFleetCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteDeviceFleetCommandInput - {@link DeleteDeviceFleetCommandInput}
 * @returns {@link DeleteDeviceFleetCommandOutput}
 * @see {@link DeleteDeviceFleetCommandInput} for command's `input` shape.
 * @see {@link DeleteDeviceFleetCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DeleteDeviceFleetCommand extends DeleteDeviceFleetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteDeviceFleetRequest;
            output: {};
        };
        sdk: {
            input: DeleteDeviceFleetCommandInput;
            output: DeleteDeviceFleetCommandOutput;
        };
    };
}
