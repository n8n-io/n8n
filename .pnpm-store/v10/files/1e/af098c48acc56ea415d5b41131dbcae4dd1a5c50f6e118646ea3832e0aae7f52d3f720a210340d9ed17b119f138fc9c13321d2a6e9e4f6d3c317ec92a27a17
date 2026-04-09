import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribePipelineDefinitionForExecution$ } from "../schemas/schemas_0";
export { $Command };
export class DescribePipelineDefinitionForExecutionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribePipelineDefinitionForExecution", {})
    .n("SageMakerClient", "DescribePipelineDefinitionForExecutionCommand")
    .sc(DescribePipelineDefinitionForExecution$)
    .build() {
}
