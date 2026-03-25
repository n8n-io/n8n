import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutInvocationStepRequestFilterSensitiveLog, } from "../models/models_0";
import { de_PutInvocationStepCommand, se_PutInvocationStepCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class PutInvocationStepCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "PutInvocationStep", {})
    .n("BedrockAgentRuntimeClient", "PutInvocationStepCommand")
    .f(PutInvocationStepRequestFilterSensitiveLog, void 0)
    .ser(se_PutInvocationStepCommand)
    .de(de_PutInvocationStepCommand)
    .build() {
}
