import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListModelExplainabilityJobDefinitions$ } from "../schemas/schemas_0";
export { $Command };
export class ListModelExplainabilityJobDefinitionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelExplainabilityJobDefinitions", {})
    .n("SageMakerClient", "ListModelExplainabilityJobDefinitionsCommand")
    .sc(ListModelExplainabilityJobDefinitions$)
    .build() {
}
