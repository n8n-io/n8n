import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateDeviceFleetRequest } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateDeviceFleetCommand}.
 */
export interface CreateDeviceFleetCommandInput extends CreateDeviceFleetRequest {
}
/**
 * @public
 *
 * The output of {@link CreateDeviceFleetCommand}.
 */
export interface CreateDeviceFleetCommandOutput extends __MetadataBearer {
}
declare const CreateDeviceFleetCommand_base: {
    new (input: CreateDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<CreateDeviceFleetCommandInput, CreateDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<CreateDeviceFleetCommandInput, CreateDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a device fleet.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateDeviceFleetCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateDeviceFleetCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateDeviceFleetRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 *   RoleArn: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   OutputConfig: { // EdgeOutputConfig
 *     S3OutputLocation: "STRING_VALUE", // required
 *     KmsKeyId: "STRING_VALUE",
 *     PresetDeploymentType: "GreengrassV2Component",
 *     PresetDeploymentConfig: "STRING_VALUE",
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   EnableIotRoleAlias: true || false,
 * };
 * const command = new CreateDeviceFleetCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param CreateDeviceFleetCommandInput - {@link CreateDeviceFleetCommandInput}
 * @returns {@link CreateDeviceFleetCommandOutput}
 * @see {@link CreateDeviceFleetCommandInput} for command's `input` shape.
 * @see {@link CreateDeviceFleetCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateDeviceFleetCommand extends CreateDeviceFleetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateDeviceFleetRequest;
            output: {};
        };
        sdk: {
            input: CreateDeviceFleetCommandInput;
            output: CreateDeviceFleetCommandOutput;
        };
    };
}
