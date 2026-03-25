import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteStudioLifecycleConfigCommand, se_DeleteStudioLifecycleConfigCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteStudioLifecycleConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteStudioLifecycleConfig", {})
    .n("SageMakerClient", "DeleteStudioLifecycleConfigCommand")
    .f(void 0, void 0)
    .ser(se_DeleteStudioLifecycleConfigCommand)
    .de(de_DeleteStudioLifecycleConfigCommand)
    .build() {
}
