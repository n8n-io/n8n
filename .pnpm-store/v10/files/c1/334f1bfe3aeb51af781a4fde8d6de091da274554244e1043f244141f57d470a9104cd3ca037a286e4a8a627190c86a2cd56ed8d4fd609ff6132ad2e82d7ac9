import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListHubContentsCommand, se_ListHubContentsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListHubContentsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListHubContents", {})
    .n("SageMakerClient", "ListHubContentsCommand")
    .f(void 0, void 0)
    .ser(se_ListHubContentsCommand)
    .de(de_ListHubContentsCommand)
    .build() {
}
