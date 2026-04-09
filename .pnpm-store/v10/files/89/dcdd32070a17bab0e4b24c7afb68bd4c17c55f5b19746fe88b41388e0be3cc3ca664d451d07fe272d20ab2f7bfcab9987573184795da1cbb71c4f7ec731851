import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeTrainingPlanExtensionHistoryRequest, DescribeTrainingPlanExtensionHistoryResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeTrainingPlanExtensionHistoryCommand}.
 */
export interface DescribeTrainingPlanExtensionHistoryCommandInput extends DescribeTrainingPlanExtensionHistoryRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeTrainingPlanExtensionHistoryCommand}.
 */
export interface DescribeTrainingPlanExtensionHistoryCommandOutput extends DescribeTrainingPlanExtensionHistoryResponse, __MetadataBearer {
}
declare const DescribeTrainingPlanExtensionHistoryCommand_base: {
    new (input: DescribeTrainingPlanExtensionHistoryCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrainingPlanExtensionHistoryCommandInput, DescribeTrainingPlanExtensionHistoryCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeTrainingPlanExtensionHistoryCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeTrainingPlanExtensionHistoryCommandInput, DescribeTrainingPlanExtensionHistoryCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves the extension history for a specified training plan. The response includes details about each extension, such as the offering ID, start and end dates, status, payment status, and cost information.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeTrainingPlanExtensionHistoryCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeTrainingPlanExtensionHistoryCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeTrainingPlanExtensionHistoryRequest
 *   TrainingPlanArn: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new DescribeTrainingPlanExtensionHistoryCommand(input);
 * const response = await client.send(command);
 * // { // DescribeTrainingPlanExtensionHistoryResponse
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
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeTrainingPlanExtensionHistoryCommandInput - {@link DescribeTrainingPlanExtensionHistoryCommandInput}
 * @returns {@link DescribeTrainingPlanExtensionHistoryCommandOutput}
 * @see {@link DescribeTrainingPlanExtensionHistoryCommandInput} for command's `input` shape.
 * @see {@link DescribeTrainingPlanExtensionHistoryCommandOutput} for command's `response` shape.
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
export declare class DescribeTrainingPlanExtensionHistoryCommand extends DescribeTrainingPlanExtensionHistoryCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeTrainingPlanExtensionHistoryRequest;
            output: DescribeTrainingPlanExtensionHistoryResponse;
        };
        sdk: {
            input: DescribeTrainingPlanExtensionHistoryCommandInput;
            output: DescribeTrainingPlanExtensionHistoryCommandOutput;
        };
    };
}
