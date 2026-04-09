import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeAppImageConfig$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeAppImageConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAppImageConfig", {})
    .n("SageMakerClient", "DescribeAppImageConfigCommand")
    .sc(DescribeAppImageConfig$)
    .build() {
}
