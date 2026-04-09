import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribePrincipalMapping$ } from "../schemas/schemas_0";
export { $Command };
export class DescribePrincipalMappingCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribePrincipalMapping", {})
    .n("KendraClient", "DescribePrincipalMappingCommand")
    .sc(DescribePrincipalMapping$)
    .build() {
}
