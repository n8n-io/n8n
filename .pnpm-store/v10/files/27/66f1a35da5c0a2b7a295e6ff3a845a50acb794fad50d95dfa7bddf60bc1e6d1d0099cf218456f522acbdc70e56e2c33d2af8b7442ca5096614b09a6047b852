import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateInferenceExperimentCommand, se_CreateInferenceExperimentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateInferenceExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateInferenceExperiment", {})
    .n("SageMakerClient", "CreateInferenceExperimentCommand")
    .f(void 0, void 0)
    .ser(se_CreateInferenceExperimentCommand)
    .de(de_CreateInferenceExperimentCommand)
    .build() {
}
