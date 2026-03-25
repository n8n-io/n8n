import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeActionCommand, se_DescribeActionCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeAction", {})
    .n("SageMakerClient", "DescribeActionCommand")
    .f(void 0, void 0)
    .ser(se_DescribeActionCommand)
    .de(de_DescribeActionCommand)
    .build() {
}
