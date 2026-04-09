import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeFaq$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeFaqCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeFaq", {})
    .n("KendraClient", "DescribeFaqCommand")
    .sc(DescribeFaq$)
    .build() {
}
