import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateQuerySuggestionsBlockList$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateQuerySuggestionsBlockListCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateQuerySuggestionsBlockList", {})
    .n("KendraClient", "UpdateQuerySuggestionsBlockListCommand")
    .sc(UpdateQuerySuggestionsBlockList$)
    .build() {
}
