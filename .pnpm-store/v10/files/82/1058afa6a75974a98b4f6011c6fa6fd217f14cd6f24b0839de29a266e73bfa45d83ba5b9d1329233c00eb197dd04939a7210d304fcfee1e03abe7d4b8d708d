import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeExperimentCommand, se_DescribeExperimentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeExperiment", {})
    .n("SageMakerClient", "DescribeExperimentCommand")
    .f(void 0, void 0)
    .ser(se_DescribeExperimentCommand)
    .de(de_DescribeExperimentCommand)
    .build() {
}
