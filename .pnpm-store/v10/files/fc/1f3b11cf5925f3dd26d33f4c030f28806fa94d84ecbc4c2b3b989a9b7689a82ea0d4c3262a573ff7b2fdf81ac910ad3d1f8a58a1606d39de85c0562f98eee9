import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { AssociateEntitiesToExperience$ } from "../schemas/schemas_0";
export { $Command };
export class AssociateEntitiesToExperienceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "AssociateEntitiesToExperience", {})
    .n("KendraClient", "AssociateEntitiesToExperienceCommand")
    .sc(AssociateEntitiesToExperience$)
    .build() {
}
