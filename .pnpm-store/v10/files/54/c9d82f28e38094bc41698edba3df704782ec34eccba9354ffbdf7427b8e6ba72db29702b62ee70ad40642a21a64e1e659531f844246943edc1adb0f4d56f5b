import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListEdgePackagingJobs$ } from "../schemas/schemas_0";
export { $Command };
export class ListEdgePackagingJobsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEdgePackagingJobs", {})
    .n("SageMakerClient", "ListEdgePackagingJobsCommand")
    .sc(ListEdgePackagingJobs$)
    .build() {
}
