import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateNotebookInstanceLifecycleConfigCommand, se_CreateNotebookInstanceLifecycleConfigCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateNotebookInstanceLifecycleConfigCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "CreateNotebookInstanceLifecycleConfigCommand")
    .f(void 0, void 0)
    .ser(se_CreateNotebookInstanceLifecycleConfigCommand)
    .de(de_CreateNotebookInstanceLifecycleConfigCommand)
    .build() {
}
