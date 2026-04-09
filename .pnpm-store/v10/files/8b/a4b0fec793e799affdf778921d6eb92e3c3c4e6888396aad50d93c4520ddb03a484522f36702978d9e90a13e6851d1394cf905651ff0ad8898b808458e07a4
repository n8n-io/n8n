import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListComputeQuotas$ } from "../schemas/schemas_0";
export { $Command };
export class ListComputeQuotasCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListComputeQuotas", {})
    .n("SageMakerClient", "ListComputeQuotasCommand")
    .sc(ListComputeQuotas$)
    .build() {
}
