import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeIndex$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeIndexCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeIndex", {})
    .n("KendraClient", "DescribeIndexCommand")
    .sc(DescribeIndex$)
    .build() {
}
