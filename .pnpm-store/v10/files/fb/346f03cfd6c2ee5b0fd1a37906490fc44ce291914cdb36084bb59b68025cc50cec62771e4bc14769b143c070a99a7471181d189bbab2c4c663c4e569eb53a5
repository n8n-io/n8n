import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeStudioLifecycleConfigCommand, se_DescribeStudioLifecycleConfigCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeStudioLifecycleConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeStudioLifecycleConfig", {})
    .n("SageMakerClient", "DescribeStudioLifecycleConfigCommand")
    .f(void 0, void 0)
    .ser(se_DescribeStudioLifecycleConfigCommand)
    .de(de_DescribeStudioLifecycleConfigCommand)
    .build() {
}
