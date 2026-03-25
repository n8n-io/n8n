import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GenerateQueryRequestFilterSensitiveLog, GenerateQueryResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GenerateQueryCommand, se_GenerateQueryCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GenerateQueryCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "GenerateQuery", {})
    .n("BedrockAgentRuntimeClient", "GenerateQueryCommand")
    .f(GenerateQueryRequestFilterSensitiveLog, GenerateQueryResponseFilterSensitiveLog)
    .ser(se_GenerateQueryCommand)
    .de(de_GenerateQueryCommand)
    .build() {
}
