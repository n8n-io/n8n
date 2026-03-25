import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateTrainingPlanRequest, CreateTrainingPlanResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateTrainingPlanCommand}.
 */
export interface CreateTrainingPlanCommandInput extends CreateTrainingPlanRequest {
}
/**
 * @public
 *
 * The output of {@link CreateTrainingPlanCommand}.
 */
export interface CreateTrainingPlanCommandOutput extends CreateTrainingPlanResponse, __MetadataBearer {
}
declare const CreateTrainingPlanCommand_base: {
    new (input: CreateTrainingPlanCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTrainingPlanCommandInput, CreateTrainingPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateTrainingPlanCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTrainingPlanCommandInput, CreateTrainingPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a new training plan in SageMaker to reserve compute capacity.</p> <p>Amazon SageMaker Training Plan is a capability within SageMaker that allows customers to reserve and manage GPU capacity for large-scale AI model training. It provides a way to secure predictable access to computational resources within specific timelines and budgets, without the need to manage underlying infrastructure. </p> <p> <b>How it works</b> </p> <p>Plans can be created for specific resources such as SageMaker Training Jobs or SageMaker HyperPod clusters, automatically provisioning resources, setting up infrastructure, executing workloads, and handling infrastructure failures.</p> <p> <b>Plan creation workflow</b> </p> <ul> <li> <p>Users search for available plan offerings based on their requirements (e.g., instance type, count, start time, duration) using the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SearchTrainingPlanOfferings.html">SearchTrainingPlanOfferings</a> </code> API operation.</p> </li> <li> <p>They create a plan that best matches their needs using the ID of the plan offering they want to use. </p> </li> <li> <p>After successful upfront payment, the plan's status becomes <code>Scheduled</code>. </p> </li> <li> <p>The plan can be used to:</p> <ul> <li> <p>Queue training jobs.</p> </li> <li> <p>Allocate to an instance group of a SageMaker HyperPod cluster. </p> </li> </ul> </li> <li> <p>When the plan start date arrives, it becomes <code>Active</code>. Based on available reserved capacity:</p> <ul> <li> <p>Training jobs are launched.</p> </li> <li> <p>Instance groups are provisioned.</p> </li> </ul> </li> </ul> <p> <b>Plan composition</b> </p> <p>A plan can consist of one or more Reserved Capacities, each defined by a specific instance type, quantity, Availability Zone, duration, and start and end times. For more information about Reserved Capacity, see <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ReservedCapacitySummary.html">ReservedCapacitySummary</a> </code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateTrainingPlanCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateTrainingPlanCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateTrainingPlanRequest
 *   TrainingPlanName: "STRING_VALUE", // required
 *   TrainingPlanOfferingId: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateTrainingPlanCommand(input);
 * const response = await client.send(command);
 * // { // CreateTrainingPlanResponse
 * //   TrainingPlanArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateTrainingPlanCommandInput - {@link CreateTrainingPlanCommandInput}
 * @returns {@link CreateTrainingPlanCommandOutput}
 * @see {@link CreateTrainingPlanCommandInput} for command's `input` shape.
 * @see {@link CreateTrainingPlanCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class CreateTrainingPlanCommand extends CreateTrainingPlanCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateTrainingPlanRequest;
            output: CreateTrainingPlanResponse;
        };
        sdk: {
            input: CreateTrainingPlanCommandInput;
            output: CreateTrainingPlanCommandOutput;
        };
    };
}
