import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateEndpointWeightsAndCapacitiesInput, UpdateEndpointWeightsAndCapacitiesOutput } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateEndpointWeightsAndCapacitiesCommand}.
 */
export interface UpdateEndpointWeightsAndCapacitiesCommandInput extends UpdateEndpointWeightsAndCapacitiesInput {
}
/**
 * @public
 *
 * The output of {@link UpdateEndpointWeightsAndCapacitiesCommand}.
 */
export interface UpdateEndpointWeightsAndCapacitiesCommandOutput extends UpdateEndpointWeightsAndCapacitiesOutput, __MetadataBearer {
}
declare const UpdateEndpointWeightsAndCapacitiesCommand_base: {
    new (input: UpdateEndpointWeightsAndCapacitiesCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEndpointWeightsAndCapacitiesCommandInput, UpdateEndpointWeightsAndCapacitiesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateEndpointWeightsAndCapacitiesCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateEndpointWeightsAndCapacitiesCommandInput, UpdateEndpointWeightsAndCapacitiesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates variant weight of one or more variants associated with an existing endpoint, or capacity of one variant associated with an existing endpoint. When it receives the request, SageMaker sets the endpoint status to <code>Updating</code>. After updating the endpoint, it sets the status to <code>InService</code>. To check the status of an endpoint, use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeEndpoint.html">DescribeEndpoint</a> API. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateEndpointWeightsAndCapacitiesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateEndpointWeightsAndCapacitiesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateEndpointWeightsAndCapacitiesInput
 *   EndpointName: "STRING_VALUE", // required
 *   DesiredWeightsAndCapacities: [ // DesiredWeightAndCapacityList // required
 *     { // DesiredWeightAndCapacity
 *       VariantName: "STRING_VALUE", // required
 *       DesiredWeight: Number("float"),
 *       DesiredInstanceCount: Number("int"),
 *       ServerlessUpdateConfig: { // ProductionVariantServerlessUpdateConfig
 *         MaxConcurrency: Number("int"),
 *         ProvisionedConcurrency: Number("int"),
 *       },
 *     },
 *   ],
 * };
 * const command = new UpdateEndpointWeightsAndCapacitiesCommand(input);
 * const response = await client.send(command);
 * // { // UpdateEndpointWeightsAndCapacitiesOutput
 * //   EndpointArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateEndpointWeightsAndCapacitiesCommandInput - {@link UpdateEndpointWeightsAndCapacitiesCommandInput}
 * @returns {@link UpdateEndpointWeightsAndCapacitiesCommandOutput}
 * @see {@link UpdateEndpointWeightsAndCapacitiesCommandInput} for command's `input` shape.
 * @see {@link UpdateEndpointWeightsAndCapacitiesCommandOutput} for command's `response` shape.
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
export declare class UpdateEndpointWeightsAndCapacitiesCommand extends UpdateEndpointWeightsAndCapacitiesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateEndpointWeightsAndCapacitiesInput;
            output: UpdateEndpointWeightsAndCapacitiesOutput;
        };
        sdk: {
            input: UpdateEndpointWeightsAndCapacitiesCommandInput;
            output: UpdateEndpointWeightsAndCapacitiesCommandOutput;
        };
    };
}
