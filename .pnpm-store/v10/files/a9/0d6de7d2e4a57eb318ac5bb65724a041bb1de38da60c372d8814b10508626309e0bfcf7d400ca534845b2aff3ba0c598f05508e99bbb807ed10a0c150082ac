import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeQuerySuggestionsConfig$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeQuerySuggestionsConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeQuerySuggestionsConfig", {})
    .n("KendraClient", "DescribeQuerySuggestionsConfigCommand")
    .sc(DescribeQuerySuggestionsConfig$)
    .build() {
}
