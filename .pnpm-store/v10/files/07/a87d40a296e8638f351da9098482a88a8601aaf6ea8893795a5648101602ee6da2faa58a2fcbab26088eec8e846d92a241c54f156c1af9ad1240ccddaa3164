import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateModelQualityJobDefinition$ } from "../schemas/schemas_0";
export { $Command };
export class CreateModelQualityJobDefinitionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelQualityJobDefinition", {})
    .n("SageMakerClient", "CreateModelQualityJobDefinitionCommand")
    .sc(CreateModelQualityJobDefinition$)
    .build() {
}
