import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutConfigurationSetSuppressionOptionsCommand, se_PutConfigurationSetSuppressionOptionsCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class PutConfigurationSetSuppressionOptionsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetSuppressionOptions", {})
    .n("SESv2Client", "PutConfigurationSetSuppressionOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetSuppressionOptionsCommand)
    .de(de_PutConfigurationSetSuppressionOptionsCommand)
    .build() {
}
