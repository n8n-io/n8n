import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeImageVersion$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeImageVersionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeImageVersion", {})
    .n("SageMakerClient", "DescribeImageVersionCommand")
    .sc(DescribeImageVersion$)
    .build() {
}
