import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListMlflowTrackingServers$ } from "../schemas/schemas_0";
export { $Command };
export class ListMlflowTrackingServersCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMlflowTrackingServers", {})
    .n("SageMakerClient", "ListMlflowTrackingServersCommand")
    .sc(ListMlflowTrackingServers$)
    .build() {
}
