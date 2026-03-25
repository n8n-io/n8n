import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteActionCommand, se_DeleteActionCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteAction", {})
    .n("SageMakerClient", "DeleteActionCommand")
    .f(void 0, void 0)
    .ser(se_DeleteActionCommand)
    .de(de_DeleteActionCommand)
    .build() {
}
