import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListModelExplainabilityJobDefinitionsCommand, se_ListModelExplainabilityJobDefinitionsCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class ListModelExplainabilityJobDefinitionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListModelExplainabilityJobDefinitions", {})
    .n("SageMakerClient", "ListModelExplainabilityJobDefinitionsCommand")
    .f(void 0, void 0)
    .ser(se_ListModelExplainabilityJobDefinitionsCommand)
    .de(de_ListModelExplainabilityJobDefinitionsCommand)
    .build() {
}
