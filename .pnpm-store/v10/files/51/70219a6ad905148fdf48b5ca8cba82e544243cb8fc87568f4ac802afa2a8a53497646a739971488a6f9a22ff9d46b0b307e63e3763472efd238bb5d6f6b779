import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { InvokeFlowRequestFilterSensitiveLog, InvokeFlowResponseFilterSensitiveLog, } from "../models/models_0";
import { de_InvokeFlowCommand, se_InvokeFlowCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class InvokeFlowCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeFlow", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeFlowCommand")
    .f(InvokeFlowRequestFilterSensitiveLog, InvokeFlowResponseFilterSensitiveLog)
    .ser(se_InvokeFlowCommand)
    .de(de_InvokeFlowCommand)
    .build() {
}
