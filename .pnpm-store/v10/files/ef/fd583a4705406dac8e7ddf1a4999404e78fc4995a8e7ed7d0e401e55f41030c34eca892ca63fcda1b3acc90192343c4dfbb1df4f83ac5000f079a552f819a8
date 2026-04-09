import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { SearchTrainingPlanOfferings$ } from "../schemas/schemas_0";
export { $Command };
export class SearchTrainingPlanOfferingsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "SearchTrainingPlanOfferings", {})
    .n("SageMakerClient", "SearchTrainingPlanOfferingsCommand")
    .sc(SearchTrainingPlanOfferings$)
    .build() {
}
