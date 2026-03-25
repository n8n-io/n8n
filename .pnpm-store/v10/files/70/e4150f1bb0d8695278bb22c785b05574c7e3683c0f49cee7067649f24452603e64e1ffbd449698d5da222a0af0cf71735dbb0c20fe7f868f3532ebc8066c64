import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateWorkteamCommand, se_UpdateWorkteamCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateWorkteamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateWorkteam", {})
    .n("SageMakerClient", "UpdateWorkteamCommand")
    .f(void 0, void 0)
    .ser(se_UpdateWorkteamCommand)
    .de(de_UpdateWorkteamCommand)
    .build() {
}
