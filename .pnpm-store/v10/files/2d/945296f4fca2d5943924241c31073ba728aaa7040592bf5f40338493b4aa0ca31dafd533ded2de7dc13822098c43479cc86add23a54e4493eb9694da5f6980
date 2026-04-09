import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateWorkforce$ } from "../schemas/schemas_0";
export { $Command };
export class CreateWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateWorkforce", {})
    .n("SageMakerClient", "CreateWorkforceCommand")
    .sc(CreateWorkforce$)
    .build() {
}
