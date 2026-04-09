import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateThesaurus$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateThesaurusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateThesaurus", {})
    .n("KendraClient", "UpdateThesaurusCommand")
    .sc(UpdateThesaurus$)
    .build() {
}
