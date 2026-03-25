import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutAccountDetailsRequestFilterSensitiveLog, } from "../models/models_1";
import { de_PutAccountDetailsCommand, se_PutAccountDetailsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class PutAccountDetailsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountDetails", {})
    .n("SESv2Client", "PutAccountDetailsCommand")
    .f(PutAccountDetailsRequestFilterSensitiveLog, void 0)
    .ser(se_PutAccountDetailsCommand)
    .de(de_PutAccountDetailsCommand)
    .build() {
}
