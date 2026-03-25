import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeEdgeDeploymentPlanRequest, DescribeEdgeDeploymentPlanResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeEdgeDeploymentPlanCommand}.
 */
export interface DescribeEdgeDeploymentPlanCommandInput extends DescribeEdgeDeploymentPlanRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeEdgeDeploymentPlanCommand}.
 */
export interface DescribeEdgeDeploymentPlanCommandOutput extends DescribeEdgeDeploymentPlanResponse, __MetadataBearer {
}
declare const DescribeEdgeDeploymentPlanCommand_base: {
    new (input: DescribeEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeEdgeDeploymentPlanCommandInput, DescribeEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeEdgeDeploymentPlanCommandInput, DescribeEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes an edge deployment plan with deployment status per stage.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeEdgeDeploymentPlanCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeEdgeDeploymentPlanCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeEdgeDeploymentPlanRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new DescribeEdgeDeploymentPlanCommand(input);
 * const response = await client.send(command);
 * // { // DescribeEdgeDeploymentPlanResponse
 * //   EdgeDeploymentPlanArn: "STRING_VALUE", // required
 * //   EdgeDeploymentPlanName: "STRING_VALUE", // required
 * //   ModelConfigs: [ // EdgeDeploymentModelConfigs // required
 * //     { // EdgeDeploymentModelConfig
 * //       ModelHandle: "STRING_VALUE", // required
 * //       EdgePackagingJobName: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   DeviceFleetName: "STRING_VALUE", // required
 * //   EdgeDeploymentSuccess: Number("int"),
 * //   EdgeDeploymentPending: Number("int"),
 * //   EdgeDeploymentFailed: Number("int"),
 * //   Stages: [ // DeploymentStageStatusSummaries // required
 * //     { // DeploymentStageStatusSummary
 * //       StageName: "STRING_VALUE", // required
 * //       DeviceSelectionConfig: { // DeviceSelectionConfig
 * //         DeviceSubsetType: "PERCENTAGE" || "SELECTION" || "NAMECONTAINS", // required
 * //         Percentage: Number("int"),
 * //         DeviceNames: [ // DeviceNames
 * //           "STRING_VALUE",
 * //         ],
 * //         DeviceNameContains: "STRING_VALUE",
 * //       },
 * //       DeploymentConfig: { // EdgeDeploymentConfig
 * //         FailureHandlingPolicy: "ROLLBACK_ON_FAILURE" || "DO_NOTHING", // required
 * //       },
 * //       DeploymentStatus: { // EdgeDeploymentStatus
 * //         StageStatus: "CREATING" || "READYTODEPLOY" || "STARTING" || "INPROGRESS" || "DEPLOYED" || "FAILED" || "STOPPING" || "STOPPED", // required
 * //         EdgeDeploymentSuccessInStage: Number("int"), // required
 * //         EdgeDeploymentPendingInStage: Number("int"), // required
 * //         EdgeDeploymentFailedInStage: Number("int"), // required
 * //         EdgeDeploymentStatusMessage: "STRING_VALUE",
 * //         EdgeDeploymentStageStartTime: new Date("TIMESTAMP"),
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * // };
 *
 * ```
 *
 * @param DescribeEdgeDeploymentPlanCommandInput - {@link DescribeEdgeDeploymentPlanCommandInput}
 * @returns {@link DescribeEdgeDeploymentPlanCommandOutput}
 * @see {@link DescribeEdgeDeploymentPlanCommandInput} for command's `input` shape.
 * @see {@link DescribeEdgeDeploymentPlanCommandOutput} for command's `response` shape.
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
export declare class DescribeEdgeDeploymentPlanCommand extends DescribeEdgeDeploymentPlanCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeEdgeDeploymentPlanRequest;
            output: DescribeEdgeDeploymentPlanResponse;
        };
        sdk: {
            input: DescribeEdgeDeploymentPlanCommandInput;
            output: DescribeEdgeDeploymentPlanCommandOutput;
        };
    };
}
