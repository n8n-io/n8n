import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateContextCommand, se_CreateContextCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateContextCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateContext", {})
    .n("SageMakerClient", "CreateContextCommand")
    .f(void 0, void 0)
    .ser(se_CreateContextCommand)
    .de(de_CreateContextCommand)
    .build() {
}
