import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetSagemakerServicecatalogPortfolioStatus$ } from "../schemas/schemas_0";
export { $Command };
export class GetSagemakerServicecatalogPortfolioStatusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetSagemakerServicecatalogPortfolioStatus", {})
    .n("SageMakerClient", "GetSagemakerServicecatalogPortfolioStatusCommand")
    .sc(GetSagemakerServicecatalogPortfolioStatus$)
    .build() {
}
