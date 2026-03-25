import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeTrialComponentCommand, se_DescribeTrialComponentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeTrialComponentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeTrialComponent", {})
    .n("SageMakerClient", "DescribeTrialComponentCommand")
    .f(void 0, void 0)
    .ser(se_DescribeTrialComponentCommand)
    .de(de_DescribeTrialComponentCommand)
    .build() {
}
