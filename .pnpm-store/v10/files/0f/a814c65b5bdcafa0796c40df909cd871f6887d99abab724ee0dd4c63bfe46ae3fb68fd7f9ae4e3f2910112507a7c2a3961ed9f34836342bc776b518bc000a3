import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteArtifactCommand, se_DeleteArtifactCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteArtifactCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteArtifact", {})
    .n("SageMakerClient", "DeleteArtifactCommand")
    .f(void 0, void 0)
    .ser(se_DeleteArtifactCommand)
    .de(de_DeleteArtifactCommand)
    .build() {
}
