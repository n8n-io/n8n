import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeSubscribedWorkteam$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeSubscribedWorkteamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeSubscribedWorkteam", {})
    .n("SageMakerClient", "DescribeSubscribedWorkteamCommand")
    .sc(DescribeSubscribedWorkteam$)
    .build() {
}
