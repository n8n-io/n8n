import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateThesaurus$ } from "../schemas/schemas_0";
export { $Command };
export class CreateThesaurusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateThesaurus", {})
    .n("KendraClient", "CreateThesaurusCommand")
    .sc(CreateThesaurus$)
    .build() {
}
