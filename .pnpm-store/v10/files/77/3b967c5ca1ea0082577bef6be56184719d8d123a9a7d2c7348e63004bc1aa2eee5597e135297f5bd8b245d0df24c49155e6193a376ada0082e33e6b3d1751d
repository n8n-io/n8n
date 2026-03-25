import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetEmailIdentityCommand, se_GetEmailIdentityCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetEmailIdentityCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetEmailIdentity", {})
    .n("SESv2Client", "GetEmailIdentityCommand")
    .f(void 0, void 0)
    .ser(se_GetEmailIdentityCommand)
    .de(de_GetEmailIdentityCommand)
    .build() {
}
