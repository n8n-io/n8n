import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeModelCardResponseFilterSensitiveLog, } from "../models/models_3";
import { de_DescribeModelCardCommand, se_DescribeModelCardCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeModelCardCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeModelCard", {})
    .n("SageMakerClient", "DescribeModelCardCommand")
    .f(void 0, DescribeModelCardResponseFilterSensitiveLog)
    .ser(se_DescribeModelCardCommand)
    .de(de_DescribeModelCardCommand)
    .build() {
}
