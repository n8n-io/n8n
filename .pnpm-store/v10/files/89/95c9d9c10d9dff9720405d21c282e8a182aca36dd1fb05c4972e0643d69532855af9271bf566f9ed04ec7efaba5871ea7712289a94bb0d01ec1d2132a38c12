import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateInferenceComponentRuntimeConfigCommand, se_UpdateInferenceComponentRuntimeConfigCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateInferenceComponentRuntimeConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateInferenceComponentRuntimeConfig", {})
    .n("SageMakerClient", "UpdateInferenceComponentRuntimeConfigCommand")
    .f(void 0, void 0)
    .ser(se_UpdateInferenceComponentRuntimeConfigCommand)
    .de(de_UpdateInferenceComponentRuntimeConfigCommand)
    .build() {
}
