import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListSubscribedWorkteams$ } from "../schemas/schemas_0";
export { $Command };
export class ListSubscribedWorkteamsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListSubscribedWorkteams", {})
    .n("SageMakerClient", "ListSubscribedWorkteamsCommand")
    .sc(ListSubscribedWorkteams$)
    .build() {
}
