import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListModelMetadataRequest, ListModelMetadataResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelMetadataCommand}.
 */
export interface ListModelMetadataCommandInput extends ListModelMetadataRequest {
}
/**
 * @public
 *
 * The output of {@link ListModelMetadataCommand}.
 */
export interface ListModelMetadataCommandOutput extends ListModelMetadataResponse, __MetadataBearer {
}
declare const ListModelMetadataCommand_base: {
    new (input: ListModelMetadataCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelMetadataCommandInput, ListModelMetadataCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelMetadataCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelMetadataCommandInput, ListModelMetadataCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the domain, framework, task, and model name of standard machine learning models found in common model zoos.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelMetadataCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelMetadataCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListModelMetadataRequest
 *   SearchExpression: { // ModelMetadataSearchExpression
 *     Filters: [ // ModelMetadataFilters
 *       { // ModelMetadataFilter
 *         Name: "Domain" || "Framework" || "Task" || "FrameworkVersion", // required
 *         Value: "STRING_VALUE", // required
 *       },
 *     ],
 *   },
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListModelMetadataCommand(input);
 * const response = await client.send(command);
 * // { // ListModelMetadataResponse
 * //   ModelMetadataSummaries: [ // ModelMetadataSummaries // required
 * //     { // ModelMetadataSummary
 * //       Domain: "STRING_VALUE", // required
 * //       Framework: "STRING_VALUE", // required
 * //       Task: "STRING_VALUE", // required
 * //       Model: "STRING_VALUE", // required
 * //       FrameworkVersion: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelMetadataCommandInput - {@link ListModelMetadataCommandInput}
 * @returns {@link ListModelMetadataCommandOutput}
 * @see {@link ListModelMetadataCommandInput} for command's `input` shape.
 * @see {@link ListModelMetadataCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelMetadataCommand extends ListModelMetadataCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelMetadataRequest;
            output: ListModelMetadataResponse;
        };
        sdk: {
            input: ListModelMetadataCommandInput;
            output: ListModelMetadataCommandOutput;
        };
    };
}
