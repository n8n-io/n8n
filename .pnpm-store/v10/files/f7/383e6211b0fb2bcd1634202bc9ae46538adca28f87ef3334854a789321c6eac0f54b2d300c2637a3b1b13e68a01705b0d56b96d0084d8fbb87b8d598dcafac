import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeImage$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeImageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeImage", {})
    .n("SageMakerClient", "DescribeImageCommand")
    .sc(DescribeImage$)
    .build() {
}
