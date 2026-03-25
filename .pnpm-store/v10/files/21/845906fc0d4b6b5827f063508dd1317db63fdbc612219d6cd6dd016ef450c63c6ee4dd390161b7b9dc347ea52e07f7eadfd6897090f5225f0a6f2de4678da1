import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateNotebookInstanceCommand, se_CreateNotebookInstanceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateNotebookInstanceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateNotebookInstance", {})
    .n("SageMakerClient", "CreateNotebookInstanceCommand")
    .f(void 0, void 0)
    .ser(se_CreateNotebookInstanceCommand)
    .de(de_CreateNotebookInstanceCommand)
    .build() {
}
