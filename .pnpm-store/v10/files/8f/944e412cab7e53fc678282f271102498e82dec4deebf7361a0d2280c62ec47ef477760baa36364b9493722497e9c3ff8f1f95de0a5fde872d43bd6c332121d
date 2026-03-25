import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateActionCommand, se_UpdateActionCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateAction", {})
    .n("SageMakerClient", "UpdateActionCommand")
    .f(void 0, void 0)
    .ser(se_UpdateActionCommand)
    .de(de_UpdateActionCommand)
    .build() {
}
