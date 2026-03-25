import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_StartEdgeDeploymentStageCommand, se_StartEdgeDeploymentStageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class StartEdgeDeploymentStageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "StartEdgeDeploymentStage", {})
    .n("SageMakerClient", "StartEdgeDeploymentStageCommand")
    .f(void 0, void 0)
    .ser(se_StartEdgeDeploymentStageCommand)
    .de(de_StartEdgeDeploymentStageCommand)
    .build() {
}
