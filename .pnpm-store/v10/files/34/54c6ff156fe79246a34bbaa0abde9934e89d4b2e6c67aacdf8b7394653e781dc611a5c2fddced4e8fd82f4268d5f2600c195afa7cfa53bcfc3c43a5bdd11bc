import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateCodeRepositoryCommand, se_UpdateCodeRepositoryCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateCodeRepositoryCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateCodeRepository", {})
    .n("SageMakerClient", "UpdateCodeRepositoryCommand")
    .f(void 0, void 0)
    .ser(se_UpdateCodeRepositoryCommand)
    .de(de_UpdateCodeRepositoryCommand)
    .build() {
}
