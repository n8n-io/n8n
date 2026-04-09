import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { GetSearchSuggestionsRequest, GetSearchSuggestionsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetSearchSuggestionsCommand}.
 */
export interface GetSearchSuggestionsCommandInput extends GetSearchSuggestionsRequest {
}
/**
 * @public
 *
 * The output of {@link GetSearchSuggestionsCommand}.
 */
export interface GetSearchSuggestionsCommandOutput extends GetSearchSuggestionsResponse, __MetadataBearer {
}
declare const GetSearchSuggestionsCommand_base: {
    new (input: GetSearchSuggestionsCommandInput): import("@smithy/smithy-client").CommandImpl<GetSearchSuggestionsCommandInput, GetSearchSuggestionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetSearchSuggestionsCommandInput): import("@smithy/smithy-client").CommandImpl<GetSearchSuggestionsCommandInput, GetSearchSuggestionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>An auto-complete API for the search functionality in the SageMaker console. It returns suggestions of possible matches for the property name to use in <code>Search</code> queries. Provides suggestions for <code>HyperParameters</code>, <code>Tags</code>, and <code>Metrics</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetSearchSuggestionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetSearchSuggestionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // GetSearchSuggestionsRequest
 *   Resource: "TrainingJob" || "Experiment" || "ExperimentTrial" || "ExperimentTrialComponent" || "Endpoint" || "Model" || "ModelPackage" || "ModelPackageGroup" || "Pipeline" || "PipelineExecution" || "FeatureGroup" || "FeatureMetadata" || "Image" || "ImageVersion" || "Project" || "HyperParameterTuningJob" || "ModelCard" || "PipelineVersion", // required
 *   SuggestionQuery: { // SuggestionQuery
 *     PropertyNameQuery: { // PropertyNameQuery
 *       PropertyNameHint: "STRING_VALUE", // required
 *     },
 *   },
 * };
 * const command = new GetSearchSuggestionsCommand(input);
 * const response = await client.send(command);
 * // { // GetSearchSuggestionsResponse
 * //   PropertyNameSuggestions: [ // PropertyNameSuggestionList
 * //     { // PropertyNameSuggestion
 * //       PropertyName: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetSearchSuggestionsCommandInput - {@link GetSearchSuggestionsCommandInput}
 * @returns {@link GetSearchSuggestionsCommandOutput}
 * @see {@link GetSearchSuggestionsCommandInput} for command's `input` shape.
 * @see {@link GetSearchSuggestionsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class GetSearchSuggestionsCommand extends GetSearchSuggestionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetSearchSuggestionsRequest;
            output: GetSearchSuggestionsResponse;
        };
        sdk: {
            input: GetSearchSuggestionsCommandInput;
            output: GetSearchSuggestionsCommandOutput;
        };
    };
}
