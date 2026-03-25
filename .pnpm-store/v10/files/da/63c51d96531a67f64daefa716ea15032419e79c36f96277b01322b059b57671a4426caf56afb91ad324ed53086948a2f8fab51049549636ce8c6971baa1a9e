import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_SendEmailCommand, se_SendEmailCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class SendEmailCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    EndpointId: { type: "contextParams", name: "EndpointId" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "SendEmail", {})
    .n("SESv2Client", "SendEmailCommand")
    .f(void 0, void 0)
    .ser(se_SendEmailCommand)
    .de(de_SendEmailCommand)
    .build() {
}
