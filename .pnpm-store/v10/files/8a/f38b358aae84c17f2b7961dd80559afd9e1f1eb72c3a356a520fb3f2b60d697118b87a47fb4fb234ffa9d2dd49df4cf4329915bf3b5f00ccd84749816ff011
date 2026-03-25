import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateEmailTemplateCommand, se_UpdateEmailTemplateCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class UpdateEmailTemplateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateEmailTemplate", {})
    .n("SESv2Client", "UpdateEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_UpdateEmailTemplateCommand)
    .de(de_UpdateEmailTemplateCommand)
    .build() {
}
