import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetQuerySuggestions$ } from "../schemas/schemas_0";
export { $Command };
export class GetQuerySuggestionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "GetQuerySuggestions", {})
    .n("KendraClient", "GetQuerySuggestionsCommand")
    .sc(GetQuerySuggestions$)
    .build() {
}
