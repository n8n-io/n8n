import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateArtifactCommand, se_CreateArtifactCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateArtifactCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateArtifact", {})
    .n("SageMakerClient", "CreateArtifactCommand")
    .f(void 0, void 0)
    .ser(se_CreateArtifactCommand)
    .de(de_CreateArtifactCommand)
    .build() {
}
