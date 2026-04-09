import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DisassociateEntitiesFromExperience$ } from "../schemas/schemas_0";
export { $Command };
export class DisassociateEntitiesFromExperienceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DisassociateEntitiesFromExperience", {})
    .n("KendraClient", "DisassociateEntitiesFromExperienceCommand")
    .sc(DisassociateEntitiesFromExperience$)
    .build() {
}
