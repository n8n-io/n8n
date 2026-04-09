import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListDataSourceSyncJobs$ } from "../schemas/schemas_0";
export { $Command };
export class ListDataSourceSyncJobsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListDataSourceSyncJobs", {})
    .n("KendraClient", "ListDataSourceSyncJobsCommand")
    .sc(ListDataSourceSyncJobs$)
    .build() {
}
