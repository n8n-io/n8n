import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { SearchResponseFilterSensitiveLog } from "../models/models_4";
import { de_SearchCommand, se_SearchCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class SearchCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "Search", {})
    .n("SageMakerClient", "SearchCommand")
    .f(void 0, SearchResponseFilterSensitiveLog)
    .ser(se_SearchCommand)
    .de(de_SearchCommand)
    .build() {
}
