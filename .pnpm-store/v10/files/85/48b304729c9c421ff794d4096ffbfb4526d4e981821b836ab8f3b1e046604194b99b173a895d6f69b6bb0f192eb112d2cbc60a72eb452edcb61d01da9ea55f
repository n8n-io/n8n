import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateNotebookInstanceCommand, se_UpdateNotebookInstanceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateNotebookInstanceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateNotebookInstance", {})
    .n("SageMakerClient", "UpdateNotebookInstanceCommand")
    .f(void 0, void 0)
    .ser(se_UpdateNotebookInstanceCommand)
    .de(de_UpdateNotebookInstanceCommand)
    .build() {
}
