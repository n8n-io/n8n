import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeInferenceComponent$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeInferenceComponentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeInferenceComponent", {})
    .n("SageMakerClient", "DescribeInferenceComponentCommand")
    .sc(DescribeInferenceComponent$)
    .build() {
}
