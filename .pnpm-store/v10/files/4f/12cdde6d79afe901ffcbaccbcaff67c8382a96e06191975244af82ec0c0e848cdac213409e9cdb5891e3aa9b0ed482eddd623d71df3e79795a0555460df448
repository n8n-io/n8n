import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListDataQualityJobDefinitions$ } from "../schemas/schemas_0";
export { $Command };
export class ListDataQualityJobDefinitionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListDataQualityJobDefinitions", {})
    .n("SageMakerClient", "ListDataQualityJobDefinitionsCommand")
    .sc(ListDataQualityJobDefinitions$)
    .build() {
}
