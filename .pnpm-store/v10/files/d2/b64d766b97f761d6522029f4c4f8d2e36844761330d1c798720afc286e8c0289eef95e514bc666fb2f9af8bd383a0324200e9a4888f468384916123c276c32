import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListInvocationStepsCommand, se_ListInvocationStepsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class ListInvocationStepsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "ListInvocationSteps", {})
    .n("BedrockAgentRuntimeClient", "ListInvocationStepsCommand")
    .f(void 0, void 0)
    .ser(se_ListInvocationStepsCommand)
    .de(de_ListInvocationStepsCommand)
    .build() {
}
