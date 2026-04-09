import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListIndices$ } from "../schemas/schemas_0";
export { $Command };
export class ListIndicesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListIndices", {})
    .n("KendraClient", "ListIndicesCommand")
    .sc(ListIndices$)
    .build() {
}
