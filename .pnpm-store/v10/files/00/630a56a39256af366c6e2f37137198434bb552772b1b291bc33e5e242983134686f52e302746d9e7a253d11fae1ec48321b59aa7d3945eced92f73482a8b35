import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListAccessControlConfigurations$ } from "../schemas/schemas_0";
export { $Command };
export class ListAccessControlConfigurationsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListAccessControlConfigurations", {})
    .n("KendraClient", "ListAccessControlConfigurationsCommand")
    .sc(ListAccessControlConfigurations$)
    .build() {
}
