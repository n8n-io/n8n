import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteMlflowApp$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteMlflowAppCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteMlflowApp", {})
    .n("SageMakerClient", "DeleteMlflowAppCommand")
    .sc(DeleteMlflowApp$)
    .build() {
}
