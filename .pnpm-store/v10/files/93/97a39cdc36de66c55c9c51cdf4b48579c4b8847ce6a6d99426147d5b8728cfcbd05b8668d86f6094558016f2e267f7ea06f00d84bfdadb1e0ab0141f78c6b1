import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateProjectCommand, se_UpdateProjectCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateProjectCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateProject", {})
    .n("SageMakerClient", "UpdateProjectCommand")
    .f(void 0, void 0)
    .ser(se_UpdateProjectCommand)
    .de(de_UpdateProjectCommand)
    .build() {
}
