import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateTrainingJobCommand, se_CreateTrainingJobCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateTrainingJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateTrainingJob", {})
    .n("SageMakerClient", "CreateTrainingJobCommand")
    .f(void 0, void 0)
    .ser(se_CreateTrainingJobCommand)
    .de(de_CreateTrainingJobCommand)
    .build() {
}
