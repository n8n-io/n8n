import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteTags$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteTags", {})
    .n("SageMakerClient", "DeleteTagsCommand")
    .sc(DeleteTags$)
    .build() {
}
