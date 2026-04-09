import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteFaq$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteFaqCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteFaq", {})
    .n("KendraClient", "DeleteFaqCommand")
    .sc(DeleteFaq$)
    .build() {
}
