import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateDevicesRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateDevicesCommand}.
 */
export interface UpdateDevicesCommandInput extends UpdateDevicesRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateDevicesCommand}.
 */
export interface UpdateDevicesCommandOutput extends __MetadataBearer {
}
declare const UpdateDevicesCommand_base: {
    new (input: UpdateDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateDevicesCommandInput, UpdateDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateDevicesCommandInput, UpdateDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates one or more devices in a fleet.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateDevicesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateDevicesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateDevicesRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 *   Devices: [ // Devices // required
 *     { // Device
 *       DeviceName: "STRING_VALUE", // required
 *       Description: "STRING_VALUE",
 *       IotThingName: "STRING_VALUE",
 *     },
 *   ],
 * };
 * const command = new UpdateDevicesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateDevicesCommandInput - {@link UpdateDevicesCommandInput}
 * @returns {@link UpdateDevicesCommandOutput}
 * @see {@link UpdateDevicesCommandInput} for command's `input` shape.
 * @see {@link UpdateDevicesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class UpdateDevicesCommand extends UpdateDevicesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateDevicesRequest;
            output: {};
        };
        sdk: {
            input: UpdateDevicesCommandInput;
            output: UpdateDevicesCommandOutput;
        };
    };
}
