import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListInvocationsCommand, se_ListInvocationsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class ListInvocationsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "ListInvocations", {})
    .n("BedrockAgentRuntimeClient", "ListInvocationsCommand")
    .f(void 0, void 0)
    .ser(se_ListInvocationsCommand)
    .de(de_ListInvocationsCommand)
    .build() {
}
