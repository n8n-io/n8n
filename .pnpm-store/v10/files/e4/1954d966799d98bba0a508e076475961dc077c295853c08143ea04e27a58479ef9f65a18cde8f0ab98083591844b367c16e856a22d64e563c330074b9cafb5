import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateImageCommand, se_CreateImageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateImageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateImage", {})
    .n("SageMakerClient", "CreateImageCommand")
    .f(void 0, void 0)
    .ser(se_CreateImageCommand)
    .de(de_CreateImageCommand)
    .build() {
}
