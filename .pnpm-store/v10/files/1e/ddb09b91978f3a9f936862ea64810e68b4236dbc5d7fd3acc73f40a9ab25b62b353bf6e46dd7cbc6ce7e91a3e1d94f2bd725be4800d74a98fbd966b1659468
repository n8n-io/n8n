import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteAccessControlConfiguration$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteAccessControlConfigurationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteAccessControlConfiguration", {})
    .n("KendraClient", "DeleteAccessControlConfigurationCommand")
    .sc(DeleteAccessControlConfiguration$)
    .build() {
}
