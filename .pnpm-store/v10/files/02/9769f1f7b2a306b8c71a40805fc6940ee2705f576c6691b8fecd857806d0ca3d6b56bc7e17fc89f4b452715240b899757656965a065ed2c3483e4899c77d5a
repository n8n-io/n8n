import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { RegisterDevicesRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RegisterDevicesCommand}.
 */
export interface RegisterDevicesCommandInput extends RegisterDevicesRequest {
}
/**
 * @public
 *
 * The output of {@link RegisterDevicesCommand}.
 */
export interface RegisterDevicesCommandOutput extends __MetadataBearer {
}
declare const RegisterDevicesCommand_base: {
    new (input: RegisterDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<RegisterDevicesCommandInput, RegisterDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RegisterDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<RegisterDevicesCommandInput, RegisterDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Register devices.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, RegisterDevicesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, RegisterDevicesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // RegisterDevicesRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 *   Devices: [ // Devices // required
 *     { // Device
 *       DeviceName: "STRING_VALUE", // required
 *       Description: "STRING_VALUE",
 *       IotThingName: "STRING_VALUE",
 *     },
 *   ],
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new RegisterDevicesCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param RegisterDevicesCommandInput - {@link RegisterDevicesCommandInput}
 * @returns {@link RegisterDevicesCommandOutput}
 * @see {@link RegisterDevicesCommandInput} for command's `input` shape.
 * @see {@link RegisterDevicesCommandOutput} for command's `response` shape.
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
export declare class RegisterDevicesCommand extends RegisterDevicesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RegisterDevicesRequest;
            output: {};
        };
        sdk: {
            input: RegisterDevicesCommandInput;
            output: RegisterDevicesCommandOutput;
        };
    };
}
