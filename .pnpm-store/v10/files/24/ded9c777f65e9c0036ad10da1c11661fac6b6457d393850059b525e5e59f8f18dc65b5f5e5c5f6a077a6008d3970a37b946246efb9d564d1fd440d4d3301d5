import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeFeaturedResultsSetCommand, se_DescribeFeaturedResultsSetCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeFeaturedResultsSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "DescribeFeaturedResultsSet", {})
    .n("KendraClient", "DescribeFeaturedResultsSetCommand")
    .f(void 0, void 0)
    .ser(se_DescribeFeaturedResultsSetCommand)
    .de(de_DescribeFeaturedResultsSetCommand)
    .build() {
}
