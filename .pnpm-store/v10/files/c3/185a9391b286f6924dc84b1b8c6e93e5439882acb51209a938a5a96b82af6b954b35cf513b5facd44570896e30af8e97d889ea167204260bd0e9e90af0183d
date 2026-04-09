import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateQuerySuggestionsConfig$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateQuerySuggestionsConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateQuerySuggestionsConfig", {})
    .n("KendraClient", "UpdateQuerySuggestionsConfigCommand")
    .sc(UpdateQuerySuggestionsConfig$)
    .build() {
}
