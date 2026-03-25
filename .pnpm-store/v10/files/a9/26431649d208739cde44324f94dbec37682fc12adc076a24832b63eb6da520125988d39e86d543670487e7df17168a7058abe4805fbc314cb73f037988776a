import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetCustomVerificationEmailTemplateCommand, se_GetCustomVerificationEmailTemplateCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class GetCustomVerificationEmailTemplateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "GetCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_GetCustomVerificationEmailTemplateCommand)
    .de(de_GetCustomVerificationEmailTemplateCommand)
    .build() {
}
