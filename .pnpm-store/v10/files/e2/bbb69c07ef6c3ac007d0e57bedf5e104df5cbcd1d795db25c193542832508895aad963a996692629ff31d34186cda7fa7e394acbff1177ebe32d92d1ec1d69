import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StopProcessingJob$ } from "../schemas/schemas_0";
export { $Command };
export class StopProcessingJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopProcessingJob", {})
    .n("SageMakerClient", "StopProcessingJobCommand")
    .sc(StopProcessingJob$)
    .build() {
}
