import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeDeviceRequest, DescribeDeviceResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeDeviceCommand}.
 */
export interface DescribeDeviceCommandInput extends DescribeDeviceRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeDeviceCommand}.
 */
export interface DescribeDeviceCommandOutput extends DescribeDeviceResponse, __MetadataBearer {
}
declare const DescribeDeviceCommand_base: {
    new (input: DescribeDeviceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDeviceCommandInput, DescribeDeviceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeDeviceCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeDeviceCommandInput, DescribeDeviceCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes the device.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeDeviceCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeDeviceCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeDeviceRequest
 *   NextToken: "STRING_VALUE",
 *   DeviceName: "STRING_VALUE", // required
 *   DeviceFleetName: "STRING_VALUE", // required
 * };
 * const command = new DescribeDeviceCommand(input);
 * const response = await client.send(command);
 * // { // DescribeDeviceResponse
 * //   DeviceArn: "STRING_VALUE",
 * //   DeviceName: "STRING_VALUE", // required
 * //   Description: "STRING_VALUE",
 * //   DeviceFleetName: "STRING_VALUE", // required
 * //   IotThingName: "STRING_VALUE",
 * //   RegistrationTime: new Date("TIMESTAMP"), // required
 * //   LatestHeartbeat: new Date("TIMESTAMP"),
 * //   Models: [ // EdgeModels
 * //     { // EdgeModel
 * //       ModelName: "STRING_VALUE", // required
 * //       ModelVersion: "STRING_VALUE", // required
 * //       LatestSampleTime: new Date("TIMESTAMP"),
 * //       LatestInference: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   MaxModels: Number("int"),
 * //   NextToken: "STRING_VALUE",
 * //   AgentVersion: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeDeviceCommandInput - {@link DescribeDeviceCommandInput}
 * @returns {@link DescribeDeviceCommandOutput}
 * @see {@link DescribeDeviceCommandInput} for command's `input` shape.
 * @see {@link DescribeDeviceCommandOutput} for command's `response` shape.
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
export declare class DescribeDeviceCommand extends DescribeDeviceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeDeviceRequest;
            output: DescribeDeviceResponse;
        };
        sdk: {
            input: DescribeDeviceCommandInput;
            output: DescribeDeviceCommandOutput;
        };
    };
}
