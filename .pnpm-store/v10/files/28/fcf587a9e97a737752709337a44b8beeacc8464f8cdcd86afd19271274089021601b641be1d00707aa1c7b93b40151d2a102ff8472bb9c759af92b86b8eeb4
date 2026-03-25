import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListInferenceComponentsCommand, se_ListInferenceComponentsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListInferenceComponentsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListInferenceComponents", {})
    .n("SageMakerClient", "ListInferenceComponentsCommand")
    .f(void 0, void 0)
    .ser(se_ListInferenceComponentsCommand)
    .de(de_ListInferenceComponentsCommand)
    .build() {
}
