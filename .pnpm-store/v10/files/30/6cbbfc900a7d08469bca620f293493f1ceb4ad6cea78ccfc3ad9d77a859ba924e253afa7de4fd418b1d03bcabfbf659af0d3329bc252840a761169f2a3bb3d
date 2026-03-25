import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_AssociateTrialComponentCommand, se_AssociateTrialComponentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class AssociateTrialComponentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "AssociateTrialComponent", {})
    .n("SageMakerClient", "AssociateTrialComponentCommand")
    .f(void 0, void 0)
    .ser(se_AssociateTrialComponentCommand)
    .de(de_AssociateTrialComponentCommand)
    .build() {
}
