import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetConfigurationSetCommand, se_GetConfigurationSetCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetConfigurationSetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetConfigurationSet", {})
    .n("SESv2Client", "GetConfigurationSetCommand")
    .f(void 0, void 0)
    .ser(se_GetConfigurationSetCommand)
    .de(de_GetConfigurationSetCommand)
    .build() {
}
