import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListFeaturedResultsSets$ } from "../schemas/schemas_0";
export { $Command };
export class ListFeaturedResultsSetsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListFeaturedResultsSets", {})
    .n("KendraClient", "ListFeaturedResultsSetsCommand")
    .sc(ListFeaturedResultsSets$)
    .build() {
}
