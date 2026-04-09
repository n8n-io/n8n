import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListExperiences$ } from "../schemas/schemas_0";
export { $Command };
export class ListExperiencesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListExperiences", {})
    .n("KendraClient", "ListExperiencesCommand")
    .sc(ListExperiences$)
    .build() {
}
