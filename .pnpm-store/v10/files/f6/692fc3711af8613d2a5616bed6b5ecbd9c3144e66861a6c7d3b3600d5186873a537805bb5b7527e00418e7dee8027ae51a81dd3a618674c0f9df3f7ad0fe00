import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeHyperParameterTuningJob$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeHyperParameterTuningJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeHyperParameterTuningJob", {})
    .n("SageMakerClient", "DescribeHyperParameterTuningJobCommand")
    .sc(DescribeHyperParameterTuningJob$)
    .build() {
}
