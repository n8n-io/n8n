import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteCustomVerificationEmailTemplateCommand, se_DeleteCustomVerificationEmailTemplateCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class DeleteCustomVerificationEmailTemplateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "DeleteCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_DeleteCustomVerificationEmailTemplateCommand)
    .de(de_DeleteCustomVerificationEmailTemplateCommand)
    .build() {
}
