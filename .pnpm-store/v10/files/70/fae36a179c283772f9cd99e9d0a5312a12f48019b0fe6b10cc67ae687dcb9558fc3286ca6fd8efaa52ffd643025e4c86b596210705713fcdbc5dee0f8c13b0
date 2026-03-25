import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteExperimentCommand, se_DeleteExperimentCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteExperimentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteExperiment", {})
    .n("SageMakerClient", "DeleteExperimentCommand")
    .f(void 0, void 0)
    .ser(se_DeleteExperimentCommand)
    .de(de_DeleteExperimentCommand)
    .build() {
}
