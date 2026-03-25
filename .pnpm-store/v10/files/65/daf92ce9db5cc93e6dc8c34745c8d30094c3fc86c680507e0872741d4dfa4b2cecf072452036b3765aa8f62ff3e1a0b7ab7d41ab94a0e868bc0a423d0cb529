import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListHubContentVersionsCommand, se_ListHubContentVersionsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListHubContentVersionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListHubContentVersions", {})
    .n("SageMakerClient", "ListHubContentVersionsCommand")
    .f(void 0, void 0)
    .ser(se_ListHubContentVersionsCommand)
    .de(de_ListHubContentVersionsCommand)
    .build() {
}
