import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { BatchDeleteFeaturedResultsSet$ } from "../schemas/schemas_0";
export { $Command };
export class BatchDeleteFeaturedResultsSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchDeleteFeaturedResultsSet", {})
    .n("KendraClient", "BatchDeleteFeaturedResultsSetCommand")
    .sc(BatchDeleteFeaturedResultsSet$)
    .build() {
}
