import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListModelQualityJobDefinitionsRequest, ListModelQualityJobDefinitionsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelQualityJobDefinitionsCommand}.
 */
export interface ListModelQualityJobDefinitionsCommandInput extends ListModelQualityJobDefinitionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListModelQualityJobDefinitionsCommand}.
 */
export interface ListModelQualityJobDefinitionsCommandOutput extends ListModelQualityJobDefinitionsResponse, __MetadataBearer {
}
declare const ListModelQualityJobDefinitionsCommand_base: {
    new (input: ListModelQualityJobDefinitionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelQualityJobDefinitionsCommandInput, ListModelQualityJobDefinitionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelQualityJobDefinitionsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelQualityJobDefinitionsCommandInput, ListModelQualityJobDefinitionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of model quality monitoring job definitions in your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelQualityJobDefinitionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelQualityJobDefinitionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListModelQualityJobDefinitionsRequest
 *   EndpointName: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 * };
 * const command = new ListModelQualityJobDefinitionsCommand(input);
 * const response = await client.send(command);
 * // { // ListModelQualityJobDefinitionsResponse
 * //   JobDefinitionSummaries: [ // MonitoringJobDefinitionSummaryList // required
 * //     { // MonitoringJobDefinitionSummary
 * //       MonitoringJobDefinitionName: "STRING_VALUE", // required
 * //       MonitoringJobDefinitionArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       EndpointName: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelQualityJobDefinitionsCommandInput - {@link ListModelQualityJobDefinitionsCommandInput}
 * @returns {@link ListModelQualityJobDefinitionsCommandOutput}
 * @see {@link ListModelQualityJobDefinitionsCommandInput} for command's `input` shape.
 * @see {@link ListModelQualityJobDefinitionsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelQualityJobDefinitionsCommand extends ListModelQualityJobDefinitionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelQualityJobDefinitionsRequest;
            output: ListModelQualityJobDefinitionsResponse;
        };
        sdk: {
            input: ListModelQualityJobDefinitionsCommandInput;
            output: ListModelQualityJobDefinitionsCommandOutput;
        };
    };
}
