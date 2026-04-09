import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateExperiment$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateExperiment", {})
    .n("SageMakerClient", "UpdateExperimentCommand")
    .sc(UpdateExperiment$)
    .build() {
}
