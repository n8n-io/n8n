import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateInferenceComponentCommand, se_CreateInferenceComponentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateInferenceComponentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateInferenceComponent", {})
    .n("SageMakerClient", "CreateInferenceComponentCommand")
    .f(void 0, void 0)
    .ser(se_CreateInferenceComponentCommand)
    .de(de_CreateInferenceComponentCommand)
    .build() {
}
