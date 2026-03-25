import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetSessionCommand, se_GetSessionCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetSessionCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "GetSession", {})
    .n("BedrockAgentRuntimeClient", "GetSessionCommand")
    .f(void 0, void 0)
    .ser(se_GetSessionCommand)
    .de(de_GetSessionCommand)
    .build() {
}
