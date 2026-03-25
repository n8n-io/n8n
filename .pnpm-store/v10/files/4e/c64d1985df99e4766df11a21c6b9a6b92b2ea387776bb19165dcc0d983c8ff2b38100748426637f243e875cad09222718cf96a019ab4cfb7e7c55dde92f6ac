import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_StartInferenceExperimentCommand, se_StartInferenceExperimentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class StartInferenceExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "StartInferenceExperiment", {})
    .n("SageMakerClient", "StartInferenceExperimentCommand")
    .f(void 0, void 0)
    .ser(se_StartInferenceExperimentCommand)
    .de(de_StartInferenceExperimentCommand)
    .build() {
}
