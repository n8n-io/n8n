import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateArtifactCommand, se_UpdateArtifactCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateArtifactCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateArtifact", {})
    .n("SageMakerClient", "UpdateArtifactCommand")
    .f(void 0, void 0)
    .ser(se_UpdateArtifactCommand)
    .de(de_UpdateArtifactCommand)
    .build() {
}
