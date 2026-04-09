import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { StopDataSourceSyncJob$ } from "../schemas/schemas_0";
export { $Command };
export class StopDataSourceSyncJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "StopDataSourceSyncJob", {})
    .n("KendraClient", "StopDataSourceSyncJobCommand")
    .sc(StopDataSourceSyncJob$)
    .build() {
}
