import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { RetrieveAndGenerateStreamResponseFilterSensitiveLog, } from "../models/models_0";
import { RetrieveAndGenerateStreamRequestFilterSensitiveLog, } from "../models/models_1";
import { de_RetrieveAndGenerateStreamCommand, se_RetrieveAndGenerateStreamCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class RetrieveAndGenerateStreamCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "RetrieveAndGenerateStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "RetrieveAndGenerateStreamCommand")
    .f(RetrieveAndGenerateStreamRequestFilterSensitiveLog, RetrieveAndGenerateStreamResponseFilterSensitiveLog)
    .ser(se_RetrieveAndGenerateStreamCommand)
    .de(de_RetrieveAndGenerateStreamCommand)
    .build() {
}
