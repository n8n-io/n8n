import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeIndexResponseFilterSensitiveLog, } from "../models/models_0";
import { de_DescribeIndexCommand, se_DescribeIndexCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeIndexCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "DescribeIndex", {})
    .n("KendraClient", "DescribeIndexCommand")
    .f(void 0, DescribeIndexResponseFilterSensitiveLog)
    .ser(se_DescribeIndexCommand)
    .de(de_DescribeIndexCommand)
    .build() {
}
