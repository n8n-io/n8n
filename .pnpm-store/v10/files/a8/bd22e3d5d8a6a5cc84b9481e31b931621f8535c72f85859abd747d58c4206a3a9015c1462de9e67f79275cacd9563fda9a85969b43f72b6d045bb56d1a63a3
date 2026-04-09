import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeTransformJob$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeTransformJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTransformJob", {})
    .n("SageMakerClient", "DescribeTransformJobCommand")
    .sc(DescribeTransformJob$)
    .build() {
}
