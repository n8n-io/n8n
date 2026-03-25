import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeAutoMLJobV2Command, se_DescribeAutoMLJobV2Command } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeAutoMLJobV2Command extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeAutoMLJobV2", {})
    .n("SageMakerClient", "DescribeAutoMLJobV2Command")
    .f(void 0, void 0)
    .ser(se_DescribeAutoMLJobV2Command)
    .de(de_DescribeAutoMLJobV2Command)
    .build() {
}
