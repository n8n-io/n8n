import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateCodeRepositoryCommand, se_CreateCodeRepositoryCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateCodeRepositoryCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateCodeRepository", {})
    .n("SageMakerClient", "CreateCodeRepositoryCommand")
    .f(void 0, void 0)
    .ser(se_CreateCodeRepositoryCommand)
    .de(de_CreateCodeRepositoryCommand)
    .build() {
}
