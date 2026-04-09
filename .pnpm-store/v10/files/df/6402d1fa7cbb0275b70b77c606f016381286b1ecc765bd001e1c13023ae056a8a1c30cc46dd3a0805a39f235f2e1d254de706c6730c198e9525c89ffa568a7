import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeFeaturedResultsSet$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeFeaturedResultsSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeFeaturedResultsSet", {})
    .n("KendraClient", "DescribeFeaturedResultsSetCommand")
    .sc(DescribeFeaturedResultsSet$)
    .build() {
}
