import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateWorkforce$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateWorkforce", {})
    .n("SageMakerClient", "UpdateWorkforceCommand")
    .sc(UpdateWorkforce$)
    .build() {
}
