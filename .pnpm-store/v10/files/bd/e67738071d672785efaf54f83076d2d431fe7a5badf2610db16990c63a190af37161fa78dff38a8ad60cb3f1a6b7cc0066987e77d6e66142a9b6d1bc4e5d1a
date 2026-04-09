import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ExtendTrainingPlanRequest, ExtendTrainingPlanResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ExtendTrainingPlanCommand}.
 */
export interface ExtendTrainingPlanCommandInput extends ExtendTrainingPlanRequest {
}
/**
 * @public
 *
 * The output of {@link ExtendTrainingPlanCommand}.
 */
export interface ExtendTrainingPlanCommandOutput extends ExtendTrainingPlanResponse, __MetadataBearer {
}
declare const ExtendTrainingPlanCommand_base: {
    new (input: ExtendTrainingPlanCommandInput): import("@smithy/smithy-client").CommandImpl<ExtendTrainingPlanCommandInput, ExtendTrainingPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ExtendTrainingPlanCommandInput): import("@smithy/smithy-client").CommandImpl<ExtendTrainingPlanCommandInput, ExtendTrainingPlanCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Extends an existing training plan by purchasing an extension offering. This allows you to add additional compute capacity time to your training plan without creating a new plan or reconfiguring your workloads.</p> <p>To find available extension offerings, use the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_SearchTrainingPlanOfferings.html">SearchTrainingPlanOfferings</a> </code> API with the <code>TrainingPlanArn</code> parameter.</p> <p>To view the history of extensions for a training plan, use the <code> <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeTrainingPlanExtensionHistory.html">DescribeTrainingPlanExtensionHistory</a> </code> API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ExtendTrainingPlanCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ExtendTrainingPlanCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ExtendTrainingPlanRequest
 *   TrainingPlanExtensionOfferingId: "STRING_VALUE", // required
 * };
 * const command = new ExtendTrainingPlanCommand(input);
 * const response = await client.send(command);
 * // { // ExtendTrainingPlanResponse
 * //   TrainingPlanExtensions: [ // TrainingPlanExtensions // required
 * //     { // TrainingPlanExtension
 * //       TrainingPlanExtensionOfferingId: "STRING_VALUE", // required
 * //       ExtendedAt: new Date("TIMESTAMP"),
 * //       StartDate: new Date("TIMESTAMP"),
 * //       EndDate: new Date("TIMESTAMP"),
 * //       Status: "STRING_VALUE",
 * //       PaymentStatus: "STRING_VALUE",
 * //       AvailabilityZone: "STRING_VALUE",
 * //       AvailabilityZoneId: "STRING_VALUE",
 * //       DurationHours: Number("int"),
 * //       UpfrontFee: "STRING_VALUE",
 * //       CurrencyCode: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ExtendTrainingPlanCommandInput - {@link ExtendTrainingPlanCommandInput}
 * @returns {@link ExtendTrainingPlanCommandOutput}
 * @see {@link ExtendTrainingPlanCommandInput} for command's `input` shape.
 * @see {@link ExtendTrainingPlanCommandOutput} for command's `response` shape.
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
export declare class ExtendTrainingPlanCommand extends ExtendTrainingPlanCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ExtendTrainingPlanRequest;
            output: ExtendTrainingPlanResponse;
        };
        sdk: {
            input: ExtendTrainingPlanCommandInput;
            output: ExtendTrainingPlanCommandOutput;
        };
    };
}
