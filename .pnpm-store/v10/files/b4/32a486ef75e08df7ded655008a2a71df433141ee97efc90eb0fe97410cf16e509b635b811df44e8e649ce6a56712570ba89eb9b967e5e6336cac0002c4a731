import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetAccountResponseFilterSensitiveLog } from "../models/models_0";
import { de_GetAccountCommand, se_GetAccountCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetAccountCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetAccount", {})
    .n("SESv2Client", "GetAccountCommand")
    .f(void 0, GetAccountResponseFilterSensitiveLog)
    .ser(se_GetAccountCommand)
    .de(de_GetAccountCommand)
    .build() {
}
