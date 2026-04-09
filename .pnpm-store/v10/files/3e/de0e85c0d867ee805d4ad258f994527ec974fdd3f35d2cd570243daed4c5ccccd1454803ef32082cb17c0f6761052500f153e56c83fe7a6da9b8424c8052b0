import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateClusterSchedulerConfig$ } from "../schemas/schemas_0";
export { $Command };
export class CreateClusterSchedulerConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateClusterSchedulerConfig", {})
    .n("SageMakerClient", "CreateClusterSchedulerConfigCommand")
    .sc(CreateClusterSchedulerConfig$)
    .build() {
}
