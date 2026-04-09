import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { GetDeviceFleetReportRequest, GetDeviceFleetReportResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetDeviceFleetReportCommand}.
 */
export interface GetDeviceFleetReportCommandInput extends GetDeviceFleetReportRequest {
}
/**
 * @public
 *
 * The output of {@link GetDeviceFleetReportCommand}.
 */
export interface GetDeviceFleetReportCommandOutput extends GetDeviceFleetReportResponse, __MetadataBearer {
}
declare const GetDeviceFleetReportCommand_base: {
    new (input: GetDeviceFleetReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDeviceFleetReportCommandInput, GetDeviceFleetReportCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetDeviceFleetReportCommandInput): import("@smithy/smithy-client").CommandImpl<GetDeviceFleetReportCommandInput, GetDeviceFleetReportCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes a fleet.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetDeviceFleetReportCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetDeviceFleetReportCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // GetDeviceFleetReportRequest
 *   DeviceFleetName: "STRING_VALUE", // required
 * };
 * const command = new GetDeviceFleetReportCommand(input);
 * const response = await client.send(command);
 * // { // GetDeviceFleetReportResponse
 * //   DeviceFleetArn: "STRING_VALUE", // required
 * //   DeviceFleetName: "STRING_VALUE", // required
 * //   OutputConfig: { // EdgeOutputConfig
 * //     S3OutputLocation: "STRING_VALUE", // required
 * //     KmsKeyId: "STRING_VALUE",
 * //     PresetDeploymentType: "GreengrassV2Component",
 * //     PresetDeploymentConfig: "STRING_VALUE",
 * //   },
 * //   Description: "STRING_VALUE",
 * //   ReportGenerated: new Date("TIMESTAMP"),
 * //   DeviceStats: { // DeviceStats
 * //     ConnectedDeviceCount: Number("long"), // required
 * //     RegisteredDeviceCount: Number("long"), // required
 * //   },
 * //   AgentVersions: [ // AgentVersions
 * //     { // AgentVersion
 * //       Version: "STRING_VALUE", // required
 * //       AgentCount: Number("long"), // required
 * //     },
 * //   ],
 * //   ModelStats: [ // EdgeModelStats
 * //     { // EdgeModelStat
 * //       ModelName: "STRING_VALUE", // required
 * //       ModelVersion: "STRING_VALUE", // required
 * //       OfflineDeviceCount: Number("long"), // required
 * //       ConnectedDeviceCount: Number("long"), // required
 * //       ActiveDeviceCount: Number("long"), // required
 * //       SamplingDeviceCount: Number("long"), // required
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetDeviceFleetReportCommandInput - {@link GetDeviceFleetReportCommandInput}
 * @returns {@link GetDeviceFleetReportCommandOutput}
 * @see {@link GetDeviceFleetReportCommandInput} for command's `input` shape.
 * @see {@link GetDeviceFleetReportCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class GetDeviceFleetReportCommand extends GetDeviceFleetReportCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetDeviceFleetReportRequest;
            output: GetDeviceFleetReportResponse;
        };
        sdk: {
            input: GetDeviceFleetReportCommandInput;
            output: GetDeviceFleetReportCommandOutput;
        };
    };
}
