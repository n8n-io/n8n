import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteEdgeDeploymentPlan$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteEdgeDeploymentPlanCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteEdgeDeploymentPlan", {})
    .n("SageMakerClient", "DeleteEdgeDeploymentPlanCommand")
    .sc(DeleteEdgeDeploymentPlan$)
    .build() {
}
