import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteHubContentCommand, se_DeleteHubContentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteHubContentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteHubContent", {})
    .n("SageMakerClient", "DeleteHubContentCommand")
    .f(void 0, void 0)
    .ser(se_DeleteHubContentCommand)
    .de(de_DeleteHubContentCommand)
    .build() {
}
