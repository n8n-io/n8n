import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeAlgorithm$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeAlgorithmCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAlgorithm", {})
    .n("SageMakerClient", "DescribeAlgorithmCommand")
    .sc(DescribeAlgorithm$)
    .build() {
}
