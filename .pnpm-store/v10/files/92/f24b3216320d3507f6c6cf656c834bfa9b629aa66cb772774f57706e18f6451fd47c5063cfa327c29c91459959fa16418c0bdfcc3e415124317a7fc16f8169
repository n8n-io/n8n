import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateCluster$ } from "../schemas/schemas_0";
export { $Command };
export class CreateClusterCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateCluster", {})
    .n("SageMakerClient", "CreateClusterCommand")
    .sc(CreateCluster$)
    .build() {
}
