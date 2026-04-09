import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListThesauri$ } from "../schemas/schemas_0";
export { $Command };
export class ListThesauriCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListThesauri", {})
    .n("KendraClient", "ListThesauriCommand")
    .sc(ListThesauri$)
    .build() {
}
