import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DisableSagemakerServicecatalogPortfolioCommand, se_DisableSagemakerServicecatalogPortfolioCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DisableSagemakerServicecatalogPortfolioCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DisableSagemakerServicecatalogPortfolio", {})
    .n("SageMakerClient", "DisableSagemakerServicecatalogPortfolioCommand")
    .f(void 0, void 0)
    .ser(se_DisableSagemakerServicecatalogPortfolioCommand)
    .de(de_DisableSagemakerServicecatalogPortfolioCommand)
    .build() {
}
