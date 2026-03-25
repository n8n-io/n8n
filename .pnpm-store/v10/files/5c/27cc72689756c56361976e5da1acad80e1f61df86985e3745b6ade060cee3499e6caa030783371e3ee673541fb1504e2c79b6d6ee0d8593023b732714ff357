import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListNotebookInstanceLifecycleConfigsCommand, se_ListNotebookInstanceLifecycleConfigsCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class ListNotebookInstanceLifecycleConfigsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListNotebookInstanceLifecycleConfigs", {})
    .n("SageMakerClient", "ListNotebookInstanceLifecycleConfigsCommand")
    .f(void 0, void 0)
    .ser(se_ListNotebookInstanceLifecycleConfigsCommand)
    .de(de_ListNotebookInstanceLifecycleConfigsCommand)
    .build() {
}
