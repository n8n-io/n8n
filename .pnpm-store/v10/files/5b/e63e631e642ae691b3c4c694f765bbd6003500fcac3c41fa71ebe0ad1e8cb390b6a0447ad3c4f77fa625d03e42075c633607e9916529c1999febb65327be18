import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { RetrieveAndGenerateResponseFilterSensitiveLog } from "../models/models_0";
import { RetrieveAndGenerateRequestFilterSensitiveLog } from "../models/models_1";
import { de_RetrieveAndGenerateCommand, se_RetrieveAndGenerateCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class RetrieveAndGenerateCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "RetrieveAndGenerate", {})
    .n("BedrockAgentRuntimeClient", "RetrieveAndGenerateCommand")
    .f(RetrieveAndGenerateRequestFilterSensitiveLog, RetrieveAndGenerateResponseFilterSensitiveLog)
    .ser(se_RetrieveAndGenerateCommand)
    .de(de_RetrieveAndGenerateCommand)
    .build() {
}
