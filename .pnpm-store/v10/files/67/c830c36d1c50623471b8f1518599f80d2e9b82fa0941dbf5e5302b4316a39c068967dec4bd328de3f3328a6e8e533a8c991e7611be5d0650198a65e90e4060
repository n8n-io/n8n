import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateContext$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateContextCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateContext", {})
    .n("SageMakerClient", "UpdateContextCommand")
    .sc(UpdateContext$)
    .build() {
}
