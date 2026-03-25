import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { OptimizePromptRequestFilterSensitiveLog, OptimizePromptResponseFilterSensitiveLog, } from "../models/models_0";
import { de_OptimizePromptCommand, se_OptimizePromptCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class OptimizePromptCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "OptimizePrompt", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "OptimizePromptCommand")
    .f(OptimizePromptRequestFilterSensitiveLog, OptimizePromptResponseFilterSensitiveLog)
    .ser(se_OptimizePromptCommand)
    .de(de_OptimizePromptCommand)
    .build() {
}
