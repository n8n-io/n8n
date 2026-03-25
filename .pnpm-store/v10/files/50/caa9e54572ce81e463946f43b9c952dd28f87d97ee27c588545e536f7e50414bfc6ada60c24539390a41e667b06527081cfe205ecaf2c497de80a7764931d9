import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_UpdateContactCommand, se_UpdateContactCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class UpdateContactCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateContact", {})
    .n("SESv2Client", "UpdateContactCommand")
    .f(void 0, void 0)
    .ser(se_UpdateContactCommand)
    .de(de_UpdateContactCommand)
    .build() {
}
