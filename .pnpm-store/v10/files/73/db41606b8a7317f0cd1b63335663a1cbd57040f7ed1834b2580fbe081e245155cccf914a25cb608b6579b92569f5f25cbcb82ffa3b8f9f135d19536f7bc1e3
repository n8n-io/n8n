import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteExperience$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteExperienceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteExperience", {})
    .n("KendraClient", "DeleteExperienceCommand")
    .sc(DeleteExperience$)
    .build() {
}
