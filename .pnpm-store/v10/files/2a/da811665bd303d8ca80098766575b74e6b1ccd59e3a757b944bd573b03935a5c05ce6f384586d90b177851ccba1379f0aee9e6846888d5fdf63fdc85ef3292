import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateAppCommand, se_CreateAppCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateAppCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateApp", {})
    .n("SageMakerClient", "CreateAppCommand")
    .f(void 0, void 0)
    .ser(se_CreateAppCommand)
    .de(de_CreateAppCommand)
    .build() {
}
