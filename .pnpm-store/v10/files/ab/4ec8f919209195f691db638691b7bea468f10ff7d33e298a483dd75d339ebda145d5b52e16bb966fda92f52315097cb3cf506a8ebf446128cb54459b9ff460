import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateExperience$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateExperienceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateExperience", {})
    .n("KendraClient", "UpdateExperienceCommand")
    .sc(UpdateExperience$)
    .build() {
}
