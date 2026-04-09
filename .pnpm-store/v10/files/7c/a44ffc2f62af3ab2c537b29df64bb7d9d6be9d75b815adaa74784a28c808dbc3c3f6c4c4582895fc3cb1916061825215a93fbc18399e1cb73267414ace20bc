import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeTrial$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeTrialCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrial", {})
    .n("SageMakerClient", "DescribeTrialCommand")
    .sc(DescribeTrial$)
    .build() {
}
