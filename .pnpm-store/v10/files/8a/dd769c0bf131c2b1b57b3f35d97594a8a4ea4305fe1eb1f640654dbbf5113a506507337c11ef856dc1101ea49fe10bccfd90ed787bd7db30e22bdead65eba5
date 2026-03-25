import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetMessageInsightsResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GetMessageInsightsCommand, se_GetMessageInsightsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetMessageInsightsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetMessageInsights", {})
    .n("SESv2Client", "GetMessageInsightsCommand")
    .f(void 0, GetMessageInsightsResponseFilterSensitiveLog)
    .ser(se_GetMessageInsightsCommand)
    .de(de_GetMessageInsightsCommand)
    .build() {
}
