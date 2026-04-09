import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ClearQuerySuggestions$ } from "../schemas/schemas_0";
export { $Command };
export class ClearQuerySuggestionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ClearQuerySuggestions", {})
    .n("KendraClient", "ClearQuerySuggestionsCommand")
    .sc(ClearQuerySuggestions$)
    .build() {
}
