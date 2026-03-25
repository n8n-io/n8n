import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListImageVersionsCommand, se_ListImageVersionsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListImageVersionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListImageVersions", {})
    .n("SageMakerClient", "ListImageVersionsCommand")
    .f(void 0, void 0)
    .ser(se_ListImageVersionsCommand)
    .de(de_ListImageVersionsCommand)
    .build() {
}
