import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeAutoMLJobV2$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeAutoMLJobV2Command extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAutoMLJobV2", {})
    .n("SageMakerClient", "DescribeAutoMLJobV2Command")
    .sc(DescribeAutoMLJobV2$)
    .build() {
}
