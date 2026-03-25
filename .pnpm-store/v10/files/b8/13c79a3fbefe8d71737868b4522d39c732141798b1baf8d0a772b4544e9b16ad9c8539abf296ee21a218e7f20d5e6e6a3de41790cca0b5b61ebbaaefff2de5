import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { EnableSagemakerServicecatalogPortfolioInput, EnableSagemakerServicecatalogPortfolioOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link EnableSagemakerServicecatalogPortfolioCommand}.
 */
export interface EnableSagemakerServicecatalogPortfolioCommandInput extends EnableSagemakerServicecatalogPortfolioInput {
}
/**
 * @public
 *
 * The output of {@link EnableSagemakerServicecatalogPortfolioCommand}.
 */
export interface EnableSagemakerServicecatalogPortfolioCommandOutput extends EnableSagemakerServicecatalogPortfolioOutput, __MetadataBearer {
}
declare const EnableSagemakerServicecatalogPortfolioCommand_base: {
    new (input: EnableSagemakerServicecatalogPortfolioCommandInput): import("@smithy/smithy-client").CommandImpl<EnableSagemakerServicecatalogPortfolioCommandInput, EnableSagemakerServicecatalogPortfolioCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [EnableSagemakerServicecatalogPortfolioCommandInput]): import("@smithy/smithy-client").CommandImpl<EnableSagemakerServicecatalogPortfolioCommandInput, EnableSagemakerServicecatalogPortfolioCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enables using Service Catalog in SageMaker. Service Catalog is used to create SageMaker projects.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, EnableSagemakerServicecatalogPortfolioCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, EnableSagemakerServicecatalogPortfolioCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = {};
 * const command = new EnableSagemakerServicecatalogPortfolioCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param EnableSagemakerServicecatalogPortfolioCommandInput - {@link EnableSagemakerServicecatalogPortfolioCommandInput}
 * @returns {@link EnableSagemakerServicecatalogPortfolioCommandOutput}
 * @see {@link EnableSagemakerServicecatalogPortfolioCommandInput} for command's `input` shape.
 * @see {@link EnableSagemakerServicecatalogPortfolioCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class EnableSagemakerServicecatalogPortfolioCommand extends EnableSagemakerServicecatalogPortfolioCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: {};
            output: {};
        };
        sdk: {
            input: EnableSagemakerServicecatalogPortfolioCommandInput;
            output: EnableSagemakerServicecatalogPortfolioCommandOutput;
        };
    };
}
