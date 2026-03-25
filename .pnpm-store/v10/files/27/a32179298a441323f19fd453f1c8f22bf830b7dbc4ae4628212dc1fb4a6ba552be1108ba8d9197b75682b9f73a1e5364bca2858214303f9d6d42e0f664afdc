import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateQuerySuggestionsConfigCommand, se_UpdateQuerySuggestionsConfigCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateQuerySuggestionsConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "UpdateQuerySuggestionsConfig", {})
    .n("KendraClient", "UpdateQuerySuggestionsConfigCommand")
    .f(void 0, void 0)
    .ser(se_UpdateQuerySuggestionsConfigCommand)
    .de(de_UpdateQuerySuggestionsConfigCommand)
    .build() {
}
