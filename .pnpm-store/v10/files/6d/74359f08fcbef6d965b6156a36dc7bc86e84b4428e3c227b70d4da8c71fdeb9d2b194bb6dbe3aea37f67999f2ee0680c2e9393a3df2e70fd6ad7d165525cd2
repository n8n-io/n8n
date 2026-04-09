import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateWorkteam$ } from "../schemas/schemas_0";
export { $Command };
export class CreateWorkteamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateWorkteam", {})
    .n("SageMakerClient", "CreateWorkteamCommand")
    .sc(CreateWorkteam$)
    .build() {
}
