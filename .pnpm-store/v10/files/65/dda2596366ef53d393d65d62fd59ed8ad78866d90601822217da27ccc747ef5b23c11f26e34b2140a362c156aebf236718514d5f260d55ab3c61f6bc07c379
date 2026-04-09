import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListInferenceRecommendationsJobsRequest, ListInferenceRecommendationsJobsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListInferenceRecommendationsJobsCommand}.
 */
export interface ListInferenceRecommendationsJobsCommandInput extends ListInferenceRecommendationsJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListInferenceRecommendationsJobsCommand}.
 */
export interface ListInferenceRecommendationsJobsCommandOutput extends ListInferenceRecommendationsJobsResponse, __MetadataBearer {
}
declare const ListInferenceRecommendationsJobsCommand_base: {
    new (input: ListInferenceRecommendationsJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListInferenceRecommendationsJobsCommandInput, ListInferenceRecommendationsJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListInferenceRecommendationsJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListInferenceRecommendationsJobsCommandInput, ListInferenceRecommendationsJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists recommendation jobs that satisfy various filters.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListInferenceRecommendationsJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListInferenceRecommendationsJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListInferenceRecommendationsJobsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "PENDING" || "IN_PROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED" || "DELETING" || "DELETED",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   ModelNameEquals: "STRING_VALUE",
 *   ModelPackageVersionArnEquals: "STRING_VALUE",
 * };
 * const command = new ListInferenceRecommendationsJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListInferenceRecommendationsJobsResponse
 * //   InferenceRecommendationsJobs: [ // InferenceRecommendationsJobs // required
 * //     { // InferenceRecommendationsJob
 * //       JobName: "STRING_VALUE", // required
 * //       JobDescription: "STRING_VALUE", // required
 * //       JobType: "Default" || "Advanced", // required
 * //       JobArn: "STRING_VALUE", // required
 * //       Status: "PENDING" || "IN_PROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED" || "DELETING" || "DELETED", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       CompletionTime: new Date("TIMESTAMP"),
 * //       RoleArn: "STRING_VALUE", // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       FailureReason: "STRING_VALUE",
 * //       ModelName: "STRING_VALUE",
 * //       SamplePayloadUrl: "STRING_VALUE",
 * //       ModelPackageVersionArn: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListInferenceRecommendationsJobsCommandInput - {@link ListInferenceRecommendationsJobsCommandInput}
 * @returns {@link ListInferenceRecommendationsJobsCommandOutput}
 * @see {@link ListInferenceRecommendationsJobsCommandInput} for command's `input` shape.
 * @see {@link ListInferenceRecommendationsJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListInferenceRecommendationsJobsCommand extends ListInferenceRecommendationsJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListInferenceRecommendationsJobsRequest;
            output: ListInferenceRecommendationsJobsResponse;
        };
        sdk: {
            input: ListInferenceRecommendationsJobsCommandInput;
            output: ListInferenceRecommendationsJobsCommandOutput;
        };
    };
}
