import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListEndpointConfigsCommand, se_ListEndpointConfigsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListEndpointConfigsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListEndpointConfigs", {})
    .n("SageMakerClient", "ListEndpointConfigsCommand")
    .f(void 0, void 0)
    .ser(se_ListEndpointConfigsCommand)
    .de(de_ListEndpointConfigsCommand)
    .build() {
}
