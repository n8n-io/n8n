import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateEndpointInput, UpdateEndpointOutput } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateEndpointCommand}.
 */
export interface UpdateEndpointCommandInput extends UpdateEndpointInput {
}
/**
 * @public
 *
 * The output of {@link UpdateEndpointCommand}.
 */
export interface UpdateEndpointCommandOutput extends UpdateEndpointOutput, __MetadataBearer {
}
declare const UpdateEndpointCommand_base: {
    new (input: UpdateEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEndpointCommandInput, UpdateEndpointCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEndpointCommandInput, UpdateEndpointCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deploys the <code>EndpointConfig</code> specified in the request to a new fleet of instances. SageMaker shifts endpoint traffic to the new instances with the updated endpoint configuration and then deletes the old instances using the previous <code>EndpointConfig</code> (there is no availability loss). For more information about how to control the update and traffic shifting process, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails.html"> Update models in production</a>.</p> <p>When SageMaker receives the request, it sets the endpoint status to <code>Updating</code>. After updating the endpoint, it sets the status to <code>InService</code>. To check the status of an endpoint, use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeEndpoint.html">DescribeEndpoint</a> API. </p> <note> <p>You must not delete an <code>EndpointConfig</code> in use by an endpoint that is live or while the <code>UpdateEndpoint</code> or <code>CreateEndpoint</code> operations are being performed on the endpoint. To update an endpoint, you must create a new <code>EndpointConfig</code>.</p> <p>If you delete the <code>EndpointConfig</code> of an endpoint that is active or being created or updated you may lose visibility into the instance type the endpoint is using. The endpoint must be deleted in order to stop incurring charges.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateEndpointCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateEndpointCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateEndpointInput
 *   EndpointName: "STRING_VALUE", // required
 *   EndpointConfigName: "STRING_VALUE", // required
 *   RetainAllVariantProperties: true || false,
 *   ExcludeRetainedVariantProperties: [ // VariantPropertyList
 *     { // VariantProperty
 *       VariantPropertyType: "DesiredInstanceCount" || "DesiredWeight" || "DataCaptureConfig", // required
 *     },
 *   ],
 *   DeploymentConfig: { // DeploymentConfig
 *     BlueGreenUpdatePolicy: { // BlueGreenUpdatePolicy
 *       TrafficRoutingConfiguration: { // TrafficRoutingConfig
 *         Type: "ALL_AT_ONCE" || "CANARY" || "LINEAR", // required
 *         WaitIntervalInSeconds: Number("int"), // required
 *         CanarySize: { // CapacitySize
 *           Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *           Value: Number("int"), // required
 *         },
 *         LinearStepSize: {
 *           Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *           Value: Number("int"), // required
 *         },
 *       },
 *       TerminationWaitInSeconds: Number("int"),
 *       MaximumExecutionTimeoutInSeconds: Number("int"),
 *     },
 *     RollingUpdatePolicy: { // RollingUpdatePolicy
 *       MaximumBatchSize: {
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *       WaitIntervalInSeconds: Number("int"), // required
 *       MaximumExecutionTimeoutInSeconds: Number("int"),
 *       RollbackMaximumBatchSize: {
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *     },
 *     AutoRollbackConfiguration: { // AutoRollbackConfig
 *       Alarms: [ // AlarmList
 *         { // Alarm
 *           AlarmName: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   },
 *   RetainDeploymentConfig: true || false,
 * };
 * const command = new UpdateEndpointCommand(input);
 * const response = await client.send(command);
 * // { // UpdateEndpointOutput
 * //   EndpointArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateEndpointCommandInput - {@link UpdateEndpointCommandInput}
 * @returns {@link UpdateEndpointCommandOutput}
 * @see {@link UpdateEndpointCommandInput} for command's `input` shape.
 * @see {@link UpdateEndpointCommandOutput} for command's `response` shape.
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
export declare class UpdateEndpointCommand extends UpdateEndpointCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateEndpointInput;
            output: UpdateEndpointOutput;
        };
        sdk: {
            input: UpdateEndpointCommandInput;
            output: UpdateEndpointCommandOutput;
        };
    };
}
