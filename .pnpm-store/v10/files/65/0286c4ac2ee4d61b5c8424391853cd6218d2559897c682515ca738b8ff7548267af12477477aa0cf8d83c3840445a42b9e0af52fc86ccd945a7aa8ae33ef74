import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateIndex$ } from "../schemas/schemas_0";
export { $Command };
export class CreateIndexCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateIndex", {})
    .n("KendraClient", "CreateIndexCommand")
    .sc(CreateIndex$)
    .build() {
}
