import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeQuerySuggestionsBlockList$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeQuerySuggestionsBlockListCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeQuerySuggestionsBlockList", {})
    .n("KendraClient", "DescribeQuerySuggestionsBlockListCommand")
    .sc(DescribeQuerySuggestionsBlockList$)
    .build() {
}
