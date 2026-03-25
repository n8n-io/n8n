import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_EndSessionCommand, se_EndSessionCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class EndSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "EndSession", {})
    .n("BedrockAgentRuntimeClient", "EndSessionCommand")
    .f(void 0, void 0)
    .ser(se_EndSessionCommand)
    .de(de_EndSessionCommand)
    .build() {
}
