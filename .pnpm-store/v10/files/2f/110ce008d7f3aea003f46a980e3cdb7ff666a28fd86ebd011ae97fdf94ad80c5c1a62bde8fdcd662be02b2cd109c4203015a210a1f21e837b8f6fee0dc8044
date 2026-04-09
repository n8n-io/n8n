import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateExperiment$ } from "../schemas/schemas_0";
export { $Command };
export class CreateExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateExperiment", {})
    .n("SageMakerClient", "CreateExperimentCommand")
    .sc(CreateExperiment$)
    .build() {
}
