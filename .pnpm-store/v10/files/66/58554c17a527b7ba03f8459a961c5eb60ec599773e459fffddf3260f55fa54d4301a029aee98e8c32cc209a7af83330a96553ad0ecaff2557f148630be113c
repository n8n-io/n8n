import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateConfigurationSetCommand, se_CreateConfigurationSetCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateConfigurationSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateConfigurationSet", {})
    .n("SESv2Client", "CreateConfigurationSetCommand")
    .f(void 0, void 0)
    .ser(se_CreateConfigurationSetCommand)
    .de(de_CreateConfigurationSetCommand)
    .build() {
}
