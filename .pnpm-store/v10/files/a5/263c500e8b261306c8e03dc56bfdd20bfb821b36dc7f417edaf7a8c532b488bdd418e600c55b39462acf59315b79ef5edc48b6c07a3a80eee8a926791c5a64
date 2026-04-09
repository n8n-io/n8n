import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteOptimizationJob$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteOptimizationJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteOptimizationJob", {})
    .n("SageMakerClient", "DeleteOptimizationJobCommand")
    .sc(DeleteOptimizationJob$)
    .build() {
}
