import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeDeviceFleetRequest, DescribeDeviceFleetResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeDeviceFleetCommand}.
 */
export interface DescribeDeviceFleetCommandInput extends DescribeDeviceFleetRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeDeviceFleetCommand}.
 */
export interface DescribeDeviceFleetCommandOutput extends DescribeDeviceFleetResponse, __MetadataBearer {
}
declare const DescribeDeviceFleetCommand_base: {
    new (input: DescribeDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDeviceFleetCommandInput, DescribeDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeDeviceFleetCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDeviceFleetCommandInput, DescribeDeviceFleetCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>A description of the fleet the device belongs to.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeDeviceFleetCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeDeviceFleetCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeDeviceFleetRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 * };
 * const command = new DescribeDeviceFleetCommand(input);
 * const response = await client.send(command);
 * // { // DescribeDeviceFleetResponse
 * //   DeviceFleetName: "STRING_VALUE", // required
 * //   DeviceFleetArn: "STRING_VALUE", // required
 * //   OutputConfig: { // EdgeOutputConfig
 * //     S3OutputLocation: "STRING_VALUE", // required
 * //     KmsKeyId: "STRING_VALUE",
 * //     PresetDeploymentType: "GreengrassV2Component",
 * //     PresetDeploymentConfig: "STRING_VALUE",
 * //   },
 * //   Description: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   LastModifiedTime: new Date("TIMESTAMP"), // required
 * //   RoleArn: "STRING_VALUE",
 * //   IotRoleAlias: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeDeviceFleetCommandInput - {@link DescribeDeviceFleetCommandInput}
 * @returns {@link DescribeDeviceFleetCommandOutput}
 * @see {@link DescribeDeviceFleetCommandInput} for command's `input` shape.
 * @see {@link DescribeDeviceFleetCommandOutput} for command's `response` shape.
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
export declare class DescribeDeviceFleetCommand extends DescribeDeviceFleetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeDeviceFleetRequest;
            output: DescribeDeviceFleetResponse;
        };
        sdk: {
            input: DescribeDeviceFleetCommandInput;
            output: DescribeDeviceFleetCommandOutput;
        };
    };
}
