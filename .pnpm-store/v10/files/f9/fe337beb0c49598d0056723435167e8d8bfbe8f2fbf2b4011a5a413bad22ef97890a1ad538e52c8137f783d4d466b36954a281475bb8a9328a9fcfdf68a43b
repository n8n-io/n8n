import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetEmailIdentityPoliciesCommand, se_GetEmailIdentityPoliciesCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetEmailIdentityPoliciesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetEmailIdentityPolicies", {})
    .n("SESv2Client", "GetEmailIdentityPoliciesCommand")
    .f(void 0, void 0)
    .ser(se_GetEmailIdentityPoliciesCommand)
    .de(de_GetEmailIdentityPoliciesCommand)
    .build() {
}
