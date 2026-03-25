import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteTagsCommand, se_DeleteTagsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteTagsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteTags", {})
    .n("SageMakerClient", "DeleteTagsCommand")
    .f(void 0, void 0)
    .ser(se_DeleteTagsCommand)
    .de(de_DeleteTagsCommand)
    .build() {
}
