import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutConfigurationSetSendingOptionsCommand, se_PutConfigurationSetSendingOptionsCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class PutConfigurationSetSendingOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetSendingOptions", {})
    .n("SESv2Client", "PutConfigurationSetSendingOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetSendingOptionsCommand)
    .de(de_PutConfigurationSetSendingOptionsCommand)
    .build() {
}
