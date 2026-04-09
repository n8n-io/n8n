import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeAction$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeActionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAction", {})
    .n("SageMakerClient", "DescribeActionCommand")
    .sc(DescribeAction$)
    .build() {
}
