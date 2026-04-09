import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListLabelingJobs$ } from "../schemas/schemas_0";
export { $Command };
export class ListLabelingJobsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListLabelingJobs", {})
    .n("SageMakerClient", "ListLabelingJobsCommand")
    .sc(ListLabelingJobs$)
    .build() {
}
