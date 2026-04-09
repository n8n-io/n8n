import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeEndpoint$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeEndpointCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeEndpoint", {})
    .n("SageMakerClient", "DescribeEndpointCommand")
    .sc(DescribeEndpoint$)
    .build() {
}
