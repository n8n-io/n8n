import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateArtifact$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateArtifactCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateArtifact", {})
    .n("SageMakerClient", "UpdateArtifactCommand")
    .sc(UpdateArtifact$)
    .build() {
}
