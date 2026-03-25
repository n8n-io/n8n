import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { RerankRequestFilterSensitiveLog, RerankResponseFilterSensitiveLog, } from "../models/models_0";
import { de_RerankCommand, se_RerankCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class RerankCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "Rerank", {})
    .n("BedrockAgentRuntimeClient", "RerankCommand")
    .f(RerankRequestFilterSensitiveLog, RerankResponseFilterSensitiveLog)
    .ser(se_RerankCommand)
    .de(de_RerankCommand)
    .build() {
}
