import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetSearchSuggestionsCommand, se_GetSearchSuggestionsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetSearchSuggestionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "GetSearchSuggestions", {})
    .n("SageMakerClient", "GetSearchSuggestionsCommand")
    .f(void 0, void 0)
    .ser(se_GetSearchSuggestionsCommand)
    .de(de_GetSearchSuggestionsCommand)
    .build() {
}
