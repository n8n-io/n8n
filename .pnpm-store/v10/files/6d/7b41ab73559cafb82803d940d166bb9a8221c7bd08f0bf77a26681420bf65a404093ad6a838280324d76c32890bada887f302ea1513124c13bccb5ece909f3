import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutPrincipalMapping$ } from "../schemas/schemas_0";
export { $Command };
export class PutPrincipalMappingCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "PutPrincipalMapping", {})
    .n("KendraClient", "PutPrincipalMappingCommand")
    .sc(PutPrincipalMapping$)
    .build() {
}
