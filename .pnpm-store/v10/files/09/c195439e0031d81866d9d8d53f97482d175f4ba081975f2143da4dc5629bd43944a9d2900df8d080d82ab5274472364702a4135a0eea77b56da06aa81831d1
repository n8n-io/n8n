import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_AddTagsCommand, se_AddTagsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class AddTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "AddTags", {})
    .n("SageMakerClient", "AddTagsCommand")
    .f(void 0, void 0)
    .ser(se_AddTagsCommand)
    .de(de_AddTagsCommand)
    .build() {
}
