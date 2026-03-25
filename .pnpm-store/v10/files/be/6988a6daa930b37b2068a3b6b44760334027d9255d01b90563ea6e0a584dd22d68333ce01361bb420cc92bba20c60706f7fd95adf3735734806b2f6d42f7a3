import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutConfigurationSetVdmOptionsCommand, se_PutConfigurationSetVdmOptionsCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class PutConfigurationSetVdmOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetVdmOptions", {})
    .n("SESv2Client", "PutConfigurationSetVdmOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetVdmOptionsCommand)
    .de(de_PutConfigurationSetVdmOptionsCommand)
    .build() {
}
