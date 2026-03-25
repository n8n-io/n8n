import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeAgentResponseFilterSensitiveLog } from "../models/models_0";
import { InvokeAgentRequestFilterSensitiveLog } from "../models/models_1";
import { de_InvokeAgentCommand, se_InvokeAgentCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class InvokeAgentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeAgent", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeAgentCommand")
    .f(InvokeAgentRequestFilterSensitiveLog, InvokeAgentResponseFilterSensitiveLog)
    .ser(se_InvokeAgentCommand)
    .de(de_InvokeAgentCommand)
    .build() {
}
