import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeInlineAgentResponseFilterSensitiveLog } from "../models/models_0";
import { InvokeInlineAgentRequestFilterSensitiveLog } from "../models/models_1";
import { de_InvokeInlineAgentCommand, se_InvokeInlineAgentCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class InvokeInlineAgentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeInlineAgent", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeInlineAgentCommand")
    .f(InvokeInlineAgentRequestFilterSensitiveLog, InvokeInlineAgentResponseFilterSensitiveLog)
    .ser(se_InvokeInlineAgentCommand)
    .de(de_InvokeInlineAgentCommand)
    .build() {
}
