import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListModelBiasJobDefinitionsCommand, se_ListModelBiasJobDefinitionsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListModelBiasJobDefinitionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListModelBiasJobDefinitions", {})
    .n("SageMakerClient", "ListModelBiasJobDefinitionsCommand")
    .f(void 0, void 0)
    .ser(se_ListModelBiasJobDefinitionsCommand)
    .de(de_ListModelBiasJobDefinitionsCommand)
    .build() {
}
