import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateModelBiasJobDefinitionCommand, se_CreateModelBiasJobDefinitionCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateModelBiasJobDefinitionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateModelBiasJobDefinition", {})
    .n("SageMakerClient", "CreateModelBiasJobDefinitionCommand")
    .f(void 0, void 0)
    .ser(se_CreateModelBiasJobDefinitionCommand)
    .de(de_CreateModelBiasJobDefinitionCommand)
    .build() {
}
