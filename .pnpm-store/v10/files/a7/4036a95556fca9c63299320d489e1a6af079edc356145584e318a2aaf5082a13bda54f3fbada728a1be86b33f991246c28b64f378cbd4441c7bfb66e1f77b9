import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeContext$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeContextCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeContext", {})
    .n("SageMakerClient", "DescribeContextCommand")
    .sc(DescribeContext$)
    .build() {
}
