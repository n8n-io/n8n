import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeDomain$ } from "../schemas/schemas_0";
export { $Command };
export class DescribeDomainCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeDomain", {})
    .n("SageMakerClient", "DescribeDomainCommand")
    .sc(DescribeDomain$)
    .build() {
}
