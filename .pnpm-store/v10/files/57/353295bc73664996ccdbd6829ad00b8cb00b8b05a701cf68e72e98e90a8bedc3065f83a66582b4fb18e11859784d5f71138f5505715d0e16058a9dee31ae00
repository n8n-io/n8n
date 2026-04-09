import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { Retrieve$ } from "../schemas/schemas_0";
export { $Command };
export class RetrieveCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "Retrieve", {})
    .n("KendraClient", "RetrieveCommand")
    .sc(Retrieve$)
    .build() {
}
