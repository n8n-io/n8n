import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteAppCommand, se_DeleteAppCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteAppCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteApp", {})
    .n("SageMakerClient", "DeleteAppCommand")
    .f(void 0, void 0)
    .ser(se_DeleteAppCommand)
    .de(de_DeleteAppCommand)
    .build() {
}
