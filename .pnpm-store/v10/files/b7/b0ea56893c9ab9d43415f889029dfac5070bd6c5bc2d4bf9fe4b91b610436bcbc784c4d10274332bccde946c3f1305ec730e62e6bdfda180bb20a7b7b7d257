import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeModelCommand, se_DescribeModelCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeModelCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeModel", {})
    .n("SageMakerClient", "DescribeModelCommand")
    .f(void 0, void 0)
    .ser(se_DescribeModelCommand)
    .de(de_DescribeModelCommand)
    .build() {
}
