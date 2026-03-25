import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListCodeRepositoriesCommand, se_ListCodeRepositoriesCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListCodeRepositoriesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListCodeRepositories", {})
    .n("SageMakerClient", "ListCodeRepositoriesCommand")
    .f(void 0, void 0)
    .ser(se_ListCodeRepositoriesCommand)
    .de(de_ListCodeRepositoriesCommand)
    .build() {
}
