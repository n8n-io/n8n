import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeModelExplainabilityJobDefinitionCommand, se_DescribeModelExplainabilityJobDefinitionCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeModelExplainabilityJobDefinitionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeModelExplainabilityJobDefinition", {})
    .n("SageMakerClient", "DescribeModelExplainabilityJobDefinitionCommand")
    .f(void 0, void 0)
    .ser(se_DescribeModelExplainabilityJobDefinitionCommand)
    .de(de_DescribeModelExplainabilityJobDefinitionCommand)
    .build() {
}
