import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateProject$ } from "../schemas/schemas_0";
export { $Command };
export class CreateProjectCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateProject", {})
    .n("SageMakerClient", "CreateProjectCommand")
    .sc(CreateProject$)
    .build() {
}
