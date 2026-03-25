import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateTrialComponentCommand, se_UpdateTrialComponentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateTrialComponentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateTrialComponent", {})
    .n("SageMakerClient", "UpdateTrialComponentCommand")
    .f(void 0, void 0)
    .ser(se_UpdateTrialComponentCommand)
    .de(de_UpdateTrialComponentCommand)
    .build() {
}
