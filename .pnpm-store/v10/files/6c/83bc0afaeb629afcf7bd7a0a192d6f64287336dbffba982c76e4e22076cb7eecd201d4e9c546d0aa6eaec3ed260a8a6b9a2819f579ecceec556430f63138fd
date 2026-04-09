import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdatePipelineVersion$ } from "../schemas/schemas_0";
export { $Command };
export class UpdatePipelineVersionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdatePipelineVersion", {})
    .n("SageMakerClient", "UpdatePipelineVersionCommand")
    .sc(UpdatePipelineVersion$)
    .build() {
}
