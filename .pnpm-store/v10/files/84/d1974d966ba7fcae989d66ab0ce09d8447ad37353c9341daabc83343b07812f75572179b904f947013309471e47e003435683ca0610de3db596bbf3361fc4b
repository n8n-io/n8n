import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListStageDevicesRequest, ListStageDevicesResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListStageDevicesCommand}.
 */
export interface ListStageDevicesCommandInput extends ListStageDevicesRequest {
}
/**
 * @public
 *
 * The output of {@link ListStageDevicesCommand}.
 */
export interface ListStageDevicesCommandOutput extends ListStageDevicesResponse, __MetadataBearer {
}
declare const ListStageDevicesCommand_base: {
    new (input: ListStageDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<ListStageDevicesCommandInput, ListStageDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListStageDevicesCommandInput): import("@smithy/smithy-client").CommandImpl<ListStageDevicesCommandInput, ListStageDevicesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists devices allocated to the stage, containing detailed device information and deployment status.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListStageDevicesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListStageDevicesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListStageDevicesRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   ExcludeDevicesDeployedInOtherStage: true || false,
 *   StageName: "STRING_VALUE", // required
 * };
 * const command = new ListStageDevicesCommand(input);
 * const response = await client.send(command);
 * // { // ListStageDevicesResponse
 * //   DeviceDeploymentSummaries: [ // DeviceDeploymentSummaries // required
 * //     { // DeviceDeploymentSummary
 * //       EdgeDeploymentPlanArn: "STRING_VALUE", // required
 * //       EdgeDeploymentPlanName: "STRING_VALUE", // required
 * //       StageName: "STRING_VALUE", // required
 * //       DeployedStageName: "STRING_VALUE",
 * //       DeviceFleetName: "STRING_VALUE",
 * //       DeviceName: "STRING_VALUE", // required
 * //       DeviceArn: "STRING_VALUE", // required
 * //       DeviceDeploymentStatus: "READYTODEPLOY" || "INPROGRESS" || "DEPLOYED" || "FAILED" || "STOPPING" || "STOPPED",
 * //       DeviceDeploymentStatusMessage: "STRING_VALUE",
 * //       Description: "STRING_VALUE",
 * //       DeploymentStartTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListStageDevicesCommandInput - {@link ListStageDevicesCommandInput}
 * @returns {@link ListStageDevicesCommandOutput}
 * @see {@link ListStageDevicesCommandInput} for command's `input` shape.
 * @see {@link ListStageDevicesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListStageDevicesCommand extends ListStageDevicesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListStageDevicesRequest;
            output: ListStageDevicesResponse;
        };
        sdk: {
            input: ListStageDevicesCommandInput;
            output: ListStageDevicesCommandOutput;
        };
    };
}
