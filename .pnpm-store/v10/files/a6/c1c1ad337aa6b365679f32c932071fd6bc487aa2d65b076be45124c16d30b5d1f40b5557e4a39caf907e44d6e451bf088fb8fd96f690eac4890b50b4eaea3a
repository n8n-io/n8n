import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeHumanTaskUiCommand, se_DescribeHumanTaskUiCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeHumanTaskUiCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeHumanTaskUi", {})
    .n("SageMakerClient", "DescribeHumanTaskUiCommand")
    .f(void 0, void 0)
    .ser(se_DescribeHumanTaskUiCommand)
    .de(de_DescribeHumanTaskUiCommand)
    .build() {
}
