import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StopEdgePackagingJob$ } from "../schemas/schemas_0";
export { $Command };
export class StopEdgePackagingJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopEdgePackagingJob", {})
    .n("SageMakerClient", "StopEdgePackagingJobCommand")
    .sc(StopEdgePackagingJob$)
    .build() {
}
