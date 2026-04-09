import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteThesaurus$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteThesaurusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteThesaurus", {})
    .n("KendraClient", "DeleteThesaurusCommand")
    .sc(DeleteThesaurus$)
    .build() {
}
