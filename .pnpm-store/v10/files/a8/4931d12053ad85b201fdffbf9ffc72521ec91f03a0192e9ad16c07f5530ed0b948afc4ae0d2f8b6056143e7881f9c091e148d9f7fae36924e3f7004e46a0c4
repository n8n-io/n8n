import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateDeviceFleetRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateDeviceFleetCommand}.
 */
export interface UpdateDeviceFleetCommandInput extends UpdateDeviceFleetRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateDeviceFleetCommand}.
 */
export interface UpdateDeviceFleetCommandOutput extends __MetadataBearer {
}
declare const UpdateDeviceFleetCommand_base: {
    new (input: UpdateDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateDeviceFleetCommandInput, UpdateDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateDeviceFleetCommandInput, UpdateDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a fleet of devices.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateDeviceFleetCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateDeviceFleetCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateDeviceFleetRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 *   RoleArn: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   OutputConfig: { // EdgeOutputConfig
 *     S3OutputLocation: "STRING_VALUE", // required
 *     KmsKeyId: "STRING_VALUE",
 *     PresetDeploymentType: "GreengrassV2Component",
 *     PresetDeploymentConfig: "STRING_VALUE",
 *   },
 *   EnableIotRoleAlias: true || false,
 * };
 * const command = new UpdateDeviceFleetCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateDeviceFleetCommandInput - {@link UpdateDeviceFleetCommandInput}
 * @returns {@link UpdateDeviceFleetCommandOutput}
 * @see {@link UpdateDeviceFleetCommandInput} for command's `input` shape.
 * @see {@link UpdateDeviceFleetCommandOutput} for command's `response` shape.
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
export declare class UpdateDeviceFleetCommand extends UpdateDeviceFleetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateDeviceFleetRequest;
            output: {};
        };
        sdk: {
            input: UpdateDeviceFleetCommandInput;
            output: UpdateDeviceFleetCommandOutput;
        };
    };
}
