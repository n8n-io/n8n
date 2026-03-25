import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeWorkforceCommand, se_DescribeWorkforceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeWorkforce", {})
    .n("SageMakerClient", "DescribeWorkforceCommand")
    .f(void 0, void 0)
    .ser(se_DescribeWorkforceCommand)
    .de(de_DescribeWorkforceCommand)
    .build() {
}
