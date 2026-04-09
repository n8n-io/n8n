import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteWorkforce$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteWorkforce", {})
    .n("SageMakerClient", "DeleteWorkforceCommand")
    .sc(DeleteWorkforce$)
    .build() {
}
