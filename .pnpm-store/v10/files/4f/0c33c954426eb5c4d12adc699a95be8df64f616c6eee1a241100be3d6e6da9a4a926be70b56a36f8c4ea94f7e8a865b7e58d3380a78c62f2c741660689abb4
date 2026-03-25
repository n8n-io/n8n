import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribePipelineDefinitionForExecutionCommand, se_DescribePipelineDefinitionForExecutionCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribePipelineDefinitionForExecutionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribePipelineDefinitionForExecution", {})
    .n("SageMakerClient", "DescribePipelineDefinitionForExecutionCommand")
    .f(void 0, void 0)
    .ser(se_DescribePipelineDefinitionForExecutionCommand)
    .de(de_DescribePipelineDefinitionForExecutionCommand)
    .build() {
}
