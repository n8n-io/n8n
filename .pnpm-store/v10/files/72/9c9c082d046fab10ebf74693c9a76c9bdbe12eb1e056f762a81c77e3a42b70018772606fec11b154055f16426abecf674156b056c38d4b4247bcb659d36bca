import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteModelBiasJobDefinition$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteModelBiasJobDefinitionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelBiasJobDefinition", {})
    .n("SageMakerClient", "DeleteModelBiasJobDefinitionCommand")
    .sc(DeleteModelBiasJobDefinition$)
    .build() {
}
