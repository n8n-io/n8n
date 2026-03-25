import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateSessionCommand, se_CreateSessionCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "CreateSession", {})
    .n("BedrockAgentRuntimeClient", "CreateSessionCommand")
    .f(void 0, void 0)
    .ser(se_CreateSessionCommand)
    .de(de_CreateSessionCommand)
    .build() {
}
