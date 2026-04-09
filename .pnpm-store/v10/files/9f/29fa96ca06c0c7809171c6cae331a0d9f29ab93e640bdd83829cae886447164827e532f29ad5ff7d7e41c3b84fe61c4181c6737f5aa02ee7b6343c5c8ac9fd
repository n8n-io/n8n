import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteCompilationJob$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteCompilationJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteCompilationJob", {})
    .n("SageMakerClient", "DeleteCompilationJobCommand")
    .sc(DeleteCompilationJob$)
    .build() {
}
