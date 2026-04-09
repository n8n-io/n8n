import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeThesaurus$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeThesaurusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeThesaurus", {})
    .n("KendraClient", "DescribeThesaurusCommand")
    .sc(DescribeThesaurus$)
    .build() {
}
