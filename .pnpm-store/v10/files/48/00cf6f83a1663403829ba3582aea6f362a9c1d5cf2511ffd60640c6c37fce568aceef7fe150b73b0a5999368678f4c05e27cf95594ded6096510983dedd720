import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListDevicesRequest, ListDevicesResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListDevicesCommand}.
 */
export interface ListDevicesCommandInput extends ListDevicesRequest {
}
/**
 * @public
 *
 * The output of {@link ListDevicesCommand}.
 */
export interface ListDevicesCommandOutput extends ListDevicesResponse, __MetadataBearer {
}
declare const ListDevicesCommand_base: {
    new (input: ListDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<ListDevicesCommandInput, ListDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListDevicesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListDevicesCommandInput, ListDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>A list of devices.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListDevicesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListDevicesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListDevicesRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   LatestHeartbeatAfter: new Date("TIMESTAMP"),
 *   ModelName: "STRING_VALUE",
 *   DeviceFleetName: "STRING_VALUE",
 * };
 * const command = new ListDevicesCommand(input);
 * const response = await client.send(command);
 * // { // ListDevicesResponse
 * //   DeviceSummaries: [ // DeviceSummaries // required
 * //     { // DeviceSummary
 * //       DeviceName: "STRING_VALUE", // required
 * //       DeviceArn: "STRING_VALUE", // required
 * //       Description: "STRING_VALUE",
 * //       DeviceFleetName: "STRING_VALUE",
 * //       IotThingName: "STRING_VALUE",
 * //       RegistrationTime: new Date("TIMESTAMP"),
 * //       LatestHeartbeat: new Date("TIMESTAMP"),
 * //       Models: [ // EdgeModelSummaries
 * //         { // EdgeModelSummary
 * //           ModelName: "STRING_VALUE", // required
 * //           ModelVersion: "STRING_VALUE", // required
 * //         },
 * //       ],
 * //       AgentVersion: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListDevicesCommandInput - {@link ListDevicesCommandInput}
 * @returns {@link ListDevicesCommandOutput}
 * @see {@link ListDevicesCommandInput} for command's `input` shape.
 * @see {@link ListDevicesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListDevicesCommand extends ListDevicesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListDevicesRequest;
            output: ListDevicesResponse;
        };
        sdk: {
            input: ListDevicesCommandInput;
            output: ListDevicesCommandOutput;
        };
    };
}
