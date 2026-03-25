import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetInvocationStepResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GetInvocationStepCommand, se_GetInvocationStepCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetInvocationStepCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "GetInvocationStep", {})
    .n("BedrockAgentRuntimeClient", "GetInvocationStepCommand")
    .f(void 0, GetInvocationStepResponseFilterSensitiveLog)
    .ser(se_GetInvocationStepCommand)
    .de(de_GetInvocationStepCommand)
    .build() {
}
