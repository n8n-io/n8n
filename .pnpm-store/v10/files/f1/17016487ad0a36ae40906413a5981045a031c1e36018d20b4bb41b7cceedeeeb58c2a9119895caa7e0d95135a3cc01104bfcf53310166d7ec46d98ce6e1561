import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateClusterSchedulerConfig$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateClusterSchedulerConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateClusterSchedulerConfig", {})
    .n("SageMakerClient", "UpdateClusterSchedulerConfigCommand")
    .sc(UpdateClusterSchedulerConfig$)
    .build() {
}
