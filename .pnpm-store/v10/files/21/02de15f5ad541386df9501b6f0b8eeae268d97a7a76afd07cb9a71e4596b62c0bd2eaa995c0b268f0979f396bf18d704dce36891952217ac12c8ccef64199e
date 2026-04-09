import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateIndex$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateIndexCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateIndex", {})
    .n("KendraClient", "UpdateIndexCommand")
    .sc(UpdateIndex$)
    .build() {
}
