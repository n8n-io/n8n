import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteInferenceExperiment$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteInferenceExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteInferenceExperiment", {})
    .n("SageMakerClient", "DeleteInferenceExperimentCommand")
    .sc(DeleteInferenceExperiment$)
    .build() {
}
