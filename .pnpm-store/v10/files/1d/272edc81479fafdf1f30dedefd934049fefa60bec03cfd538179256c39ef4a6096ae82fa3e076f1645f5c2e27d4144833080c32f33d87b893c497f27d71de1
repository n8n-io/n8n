import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateFaq$ } from "../schemas/schemas_0";
export { $Command };
export class CreateFaqCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateFaq", {})
    .n("KendraClient", "CreateFaqCommand")
    .sc(CreateFaq$)
    .build() {
}
