import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteImageCommand, se_DeleteImageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteImageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteImage", {})
    .n("SageMakerClient", "DeleteImageCommand")
    .f(void 0, void 0)
    .ser(se_DeleteImageCommand)
    .de(de_DeleteImageCommand)
    .build() {
}
