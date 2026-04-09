import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListImageVersions$ } from "../schemas/schemas_0";
export { $Command };
export class ListImageVersionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListImageVersions", {})
    .n("SageMakerClient", "ListImageVersionsCommand")
    .sc(ListImageVersions$)
    .build() {
}
