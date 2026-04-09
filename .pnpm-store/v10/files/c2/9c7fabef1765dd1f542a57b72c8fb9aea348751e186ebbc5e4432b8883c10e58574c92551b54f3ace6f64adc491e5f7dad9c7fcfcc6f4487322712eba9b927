import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateImage$ } from "../schemas/schemas_0";
export { $Command };
export class CreateImageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateImage", {})
    .n("SageMakerClient", "CreateImageCommand")
    .sc(CreateImage$)
    .build() {
}
