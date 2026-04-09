import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListOptimizationJobs$ } from "../schemas/schemas_0";
export { $Command };
export class ListOptimizationJobsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListOptimizationJobs", {})
    .n("SageMakerClient", "ListOptimizationJobsCommand")
    .sc(ListOptimizationJobs$)
    .build() {
}
