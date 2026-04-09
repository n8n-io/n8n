import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListStudioLifecycleConfigs$ } from "../schemas/schemas_0";
export { $Command };
export class ListStudioLifecycleConfigsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListStudioLifecycleConfigs", {})
    .n("SageMakerClient", "ListStudioLifecycleConfigsCommand")
    .sc(ListStudioLifecycleConfigs$)
    .build() {
}
