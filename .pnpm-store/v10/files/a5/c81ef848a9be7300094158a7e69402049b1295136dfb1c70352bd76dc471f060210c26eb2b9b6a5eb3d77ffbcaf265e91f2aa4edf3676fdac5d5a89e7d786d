import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateAutoMLJobV2$ } from "../schemas/schemas_0";
export { $Command };
export class CreateAutoMLJobV2Command extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAutoMLJobV2", {})
    .n("SageMakerClient", "CreateAutoMLJobV2Command")
    .sc(CreateAutoMLJobV2$)
    .build() {
}
