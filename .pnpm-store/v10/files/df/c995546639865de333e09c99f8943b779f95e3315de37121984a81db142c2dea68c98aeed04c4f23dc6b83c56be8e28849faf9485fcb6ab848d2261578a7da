import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateNotebookInstanceLifecycleConfig$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateNotebookInstanceLifecycleConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "UpdateNotebookInstanceLifecycleConfigCommand")
    .sc(UpdateNotebookInstanceLifecycleConfig$)
    .build() {
}
