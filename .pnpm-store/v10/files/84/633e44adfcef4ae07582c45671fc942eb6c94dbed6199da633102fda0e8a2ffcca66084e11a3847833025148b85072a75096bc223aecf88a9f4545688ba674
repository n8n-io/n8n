import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteStudioLifecycleConfig$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteStudioLifecycleConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteStudioLifecycleConfig", {})
    .n("SageMakerClient", "DeleteStudioLifecycleConfigCommand")
    .sc(DeleteStudioLifecycleConfig$)
    .build() {
}
