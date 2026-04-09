import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListClusterEvents$ } from "../schemas/schemas_0";
export { $Command };
export class ListClusterEventsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListClusterEvents", {})
    .n("SageMakerClient", "ListClusterEventsCommand")
    .sc(ListClusterEvents$)
    .build() {
}
