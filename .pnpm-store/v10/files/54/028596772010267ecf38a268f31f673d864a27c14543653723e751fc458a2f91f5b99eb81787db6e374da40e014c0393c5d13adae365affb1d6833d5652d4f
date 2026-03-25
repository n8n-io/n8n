import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeAlgorithmCommand, se_DescribeAlgorithmCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeAlgorithmCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeAlgorithm", {})
    .n("SageMakerClient", "DescribeAlgorithmCommand")
    .f(void 0, void 0)
    .ser(se_DescribeAlgorithmCommand)
    .de(de_DescribeAlgorithmCommand)
    .build() {
}
