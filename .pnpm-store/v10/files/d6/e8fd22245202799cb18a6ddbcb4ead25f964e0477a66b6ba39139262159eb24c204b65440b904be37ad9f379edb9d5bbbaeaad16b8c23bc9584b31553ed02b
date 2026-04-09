import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { GetSagemakerServicecatalogPortfolioStatusInput, GetSagemakerServicecatalogPortfolioStatusOutput } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetSagemakerServicecatalogPortfolioStatusCommand}.
 */
export interface GetSagemakerServicecatalogPortfolioStatusCommandInput extends GetSagemakerServicecatalogPortfolioStatusInput {
}
/**
 * @public
 *
 * The output of {@link GetSagemakerServicecatalogPortfolioStatusCommand}.
 */
export interface GetSagemakerServicecatalogPortfolioStatusCommandOutput extends GetSagemakerServicecatalogPortfolioStatusOutput, __MetadataBearer {
}
declare const GetSagemakerServicecatalogPortfolioStatusCommand_base: {
    new (input: GetSagemakerServicecatalogPortfolioStatusCommandInput): import("@smithy/smithy-client").CommandImpl<GetSagemakerServicecatalogPortfolioStatusCommandInput, GetSagemakerServicecatalogPortfolioStatusCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [GetSagemakerServicecatalogPortfolioStatusCommandInput]): import("@smithy/smithy-client").CommandImpl<GetSagemakerServicecatalogPortfolioStatusCommandInput, GetSagemakerServicecatalogPortfolioStatusCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets the status of Service Catalog in SageMaker. Service Catalog is used to create SageMaker projects.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetSagemakerServicecatalogPortfolioStatusCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetSagemakerServicecatalogPortfolioStatusCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = {};
 * const command = new GetSagemakerServicecatalogPortfolioStatusCommand(input);
 * const response = await client.send(command);
 * // { // GetSagemakerServicecatalogPortfolioStatusOutput
 * //   Status: "Enabled" || "Disabled",
 * // };
 *
 * ```
 *
 * @param GetSagemakerServicecatalogPortfolioStatusCommandInput - {@link GetSagemakerServicecatalogPortfolioStatusCommandInput}
 * @returns {@link GetSagemakerServicecatalogPortfolioStatusCommandOutput}
 * @see {@link GetSagemakerServicecatalogPortfolioStatusCommandInput} for command's `input` shape.
 * @see {@link GetSagemakerServicecatalogPortfolioStatusCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class GetSagemakerServicecatalogPortfolioStatusCommand extends GetSagemakerServicecatalogPortfolioStatusCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: {};
            output: GetSagemakerServicecatalogPortfolioStatusOutput;
        };
        sdk: {
            input: GetSagemakerServicecatalogPortfolioStatusCommandInput;
            output: GetSagemakerServicecatalogPortfolioStatusCommandOutput;
        };
    };
}
