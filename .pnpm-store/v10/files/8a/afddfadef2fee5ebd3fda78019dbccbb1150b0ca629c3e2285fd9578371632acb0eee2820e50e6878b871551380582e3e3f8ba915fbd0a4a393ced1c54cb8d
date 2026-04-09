import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StartDataSourceSyncJob$ } from "../schemas/schemas_0";
export { $Command };
export class StartDataSourceSyncJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "StartDataSourceSyncJob", {})
    .n("KendraClient", "StartDataSourceSyncJobCommand")
    .sc(StartDataSourceSyncJob$)
    .build() {
}
