import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { AddTags$ } from "../schemas/schemas_0";
export { $Command };
export class AddTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AddTags", {})
    .n("SageMakerClient", "AddTagsCommand")
    .sc(AddTags$)
    .build() {
}
