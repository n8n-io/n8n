import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateEdgeDeploymentPlanRequest, CreateEdgeDeploymentPlanResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateEdgeDeploymentPlanCommand}.
 */
export interface CreateEdgeDeploymentPlanCommandInput extends CreateEdgeDeploymentPlanRequest {
}
/**
 * @public
 *
 * The output of {@link CreateEdgeDeploymentPlanCommand}.
 */
export interface CreateEdgeDeploymentPlanCommandOutput extends CreateEdgeDeploymentPlanResponse, __MetadataBearer {
}
declare const CreateEdgeDeploymentPlanCommand_base: {
    new (input: CreateEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEdgeDeploymentPlanCommandInput, CreateEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateEdgeDeploymentPlanCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEdgeDeploymentPlanCommandInput, CreateEdgeDeploymentPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an edge deployment plan, consisting of multiple stages. Each stage may have a different deployment configuration and devices.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateEdgeDeploymentPlanCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateEdgeDeploymentPlanCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateEdgeDeploymentPlanRequest
 *   EdgeDeploymentPlanName: "STRING_VALUE", // required
 *   ModelConfigs: [ // EdgeDeploymentModelConfigs // required
 *     { // EdgeDeploymentModelConfig
 *       ModelHandle: "STRING_VALUE", // required
 *       EdgePackagingJobName: "STRING_VALUE", // required
 *     },
 *   ],
 *   DeviceFleetName: "STRING_VALUE", // required
 *   Stages: [ // DeploymentStages
 *     { // DeploymentStage
 *       StageName: "STRING_VALUE", // required
 *       DeviceSelectionConfig: { // DeviceSelectionConfig
 *         DeviceSubsetType: "PERCENTAGE" || "SELECTION" || "NAMECONTAINS", // required
 *         Percentage: Number("int"),
 *         DeviceNames: [ // DeviceNames
 *           "STRING_VALUE",
 *         ],
 *         DeviceNameContains: "STRING_VALUE",
 *       },
 *       DeploymentConfig: { // EdgeDeploymentConfig
 *         FailureHandlingPolicy: "ROLLBACK_ON_FAILURE" || "DO_NOTHING", // required
 *       },
 *     },
 *   ],
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateEdgeDeploymentPlanCommand(input);
 * const response = await client.send(command);
 * // { // CreateEdgeDeploymentPlanResponse
 * //   EdgeDeploymentPlanArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateEdgeDeploymentPlanCommandInput - {@link CreateEdgeDeploymentPlanCommandInput}
 * @returns {@link CreateEdgeDeploymentPlanCommandOutput}
 * @see {@link CreateEdgeDeploymentPlanCommandInput} for command's `input` shape.
 * @see {@link CreateEdgeDeploymentPlanCommandOutput} for command's `response` shape.
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
export declare class CreateEdgeDeploymentPlanCommand extends CreateEdgeDeploymentPlanCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateEdgeDeploymentPlanRequest;
            output: CreateEdgeDeploymentPlanResponse;
        };
        sdk: {
            input: CreateEdgeDeploymentPlanCommandInput;
            output: CreateEdgeDeploymentPlanCommandOutput;
        };
    };
}
