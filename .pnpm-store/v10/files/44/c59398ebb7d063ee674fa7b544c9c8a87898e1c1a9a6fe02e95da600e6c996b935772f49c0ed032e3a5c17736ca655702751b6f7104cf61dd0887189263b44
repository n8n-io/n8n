import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateAutoMLJobV2Command, se_CreateAutoMLJobV2Command } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateAutoMLJobV2Command extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateAutoMLJobV2", {})
    .n("SageMakerClient", "CreateAutoMLJobV2Command")
    .f(void 0, void 0)
    .ser(se_CreateAutoMLJobV2Command)
    .de(de_CreateAutoMLJobV2Command)
    .build() {
}
