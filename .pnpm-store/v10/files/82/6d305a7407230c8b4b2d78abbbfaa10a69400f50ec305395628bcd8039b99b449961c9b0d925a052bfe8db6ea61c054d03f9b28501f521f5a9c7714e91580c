import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTrainingPlansRequest, ListTrainingPlansResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTrainingPlansCommand}.
 */
export interface ListTrainingPlansCommandInput extends ListTrainingPlansRequest {
}
/**
 * @public
 *
 * The output of {@link ListTrainingPlansCommand}.
 */
export interface ListTrainingPlansCommandOutput extends ListTrainingPlansResponse, __MetadataBearer {
}
declare const ListTrainingPlansCommand_base: {
    new (input: ListTrainingPlansCommandInput): import("@smithy/smithy-client").CommandImpl<ListTrainingPlansCommandInput, ListTrainingPlansCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListTrainingPlansCommandInput]): import("@smithy/smithy-client").CommandImpl<ListTrainingPlansCommandInput, ListTrainingPlansCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves a list of training plans for the current account. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListTrainingPlansCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListTrainingPlansCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListTrainingPlansRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   StartTimeAfter: new Date("TIMESTAMP"),
 *   StartTimeBefore: new Date("TIMESTAMP"),
 *   SortBy: "TrainingPlanName" || "StartTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   Filters: [ // TrainingPlanFilters
 *     { // TrainingPlanFilter
 *       Name: "Status", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new ListTrainingPlansCommand(input);
 * const response = await client.send(command);
 * // { // ListTrainingPlansResponse
 * //   NextToken: "STRING_VALUE",
 * //   TrainingPlanSummaries: [ // TrainingPlanSummaries // required
 * //     { // TrainingPlanSummary
 * //       TrainingPlanArn: "STRING_VALUE", // required
 * //       TrainingPlanName: "STRING_VALUE", // required
 * //       Status: "Pending" || "Active" || "Scheduled" || "Expired" || "Failed", // required
 * //       StatusMessage: "STRING_VALUE",
 * //       DurationHours: Number("long"),
 * //       DurationMinutes: Number("long"),
 * //       StartTime: new Date("TIMESTAMP"),
 * //       EndTime: new Date("TIMESTAMP"),
 * //       UpfrontFee: "STRING_VALUE",
 * //       CurrencyCode: "STRING_VALUE",
 * //       TotalInstanceCount: Number("int"),
 * //       AvailableInstanceCount: Number("int"),
 * //       InUseInstanceCount: Number("int"),
 * //       TargetResources: [ // SageMakerResourceNames
 * //         "training-job" || "hyperpod-cluster",
 * //       ],
 * //       ReservedCapacitySummaries: [ // ReservedCapacitySummaries
 * //         { // ReservedCapacitySummary
 * //           ReservedCapacityArn: "STRING_VALUE", // required
 * //           InstanceType: "ml.p4d.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.trn1.32xlarge" || "ml.trn2.48xlarge", // required
 * //           TotalInstanceCount: Number("int"), // required
 * //           Status: "Pending" || "Active" || "Scheduled" || "Expired" || "Failed", // required
 * //           AvailabilityZone: "STRING_VALUE",
 * //           DurationHours: Number("long"),
 * //           DurationMinutes: Number("long"),
 * //           StartTime: new Date("TIMESTAMP"),
 * //           EndTime: new Date("TIMESTAMP"),
 * //         },
 * //       ],
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ListTrainingPlansCommandInput - {@link ListTrainingPlansCommandInput}
 * @returns {@link ListTrainingPlansCommandOutput}
 * @see {@link ListTrainingPlansCommandInput} for command's `input` shape.
 * @see {@link ListTrainingPlansCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListTrainingPlansCommand extends ListTrainingPlansCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTrainingPlansRequest;
            output: ListTrainingPlansResponse;
        };
        sdk: {
            input: ListTrainingPlansCommandInput;
            output: ListTrainingPlansCommandOutput;
        };
    };
}
