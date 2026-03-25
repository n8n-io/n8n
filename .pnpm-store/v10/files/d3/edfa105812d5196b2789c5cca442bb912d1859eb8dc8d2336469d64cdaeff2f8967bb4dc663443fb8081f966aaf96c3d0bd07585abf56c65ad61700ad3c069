import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteEdgeDeploymentStageCommand, se_DeleteEdgeDeploymentStageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteEdgeDeploymentStageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteEdgeDeploymentStage", {})
    .n("SageMakerClient", "DeleteEdgeDeploymentStageCommand")
    .f(void 0, void 0)
    .ser(se_DeleteEdgeDeploymentStageCommand)
    .de(de_DeleteEdgeDeploymentStageCommand)
    .build() {
}
