import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListApps$ } from "../schemas/schemas_0";
export { $Command };
export class ListAppsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListApps", {})
    .n("SageMakerClient", "ListAppsCommand")
    .sc(ListApps$)
    .build() {
}
