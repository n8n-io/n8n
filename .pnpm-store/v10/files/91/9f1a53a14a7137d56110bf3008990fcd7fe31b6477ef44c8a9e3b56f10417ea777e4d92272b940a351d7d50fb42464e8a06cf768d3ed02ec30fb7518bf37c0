import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { RetrieveResponseFilterSensitiveLog } from "../models/models_0";
import { RetrieveRequestFilterSensitiveLog } from "../models/models_1";
import { de_RetrieveCommand, se_RetrieveCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class RetrieveCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonBedrockAgentRunTimeService", "Retrieve", {})
    .n("BedrockAgentRuntimeClient", "RetrieveCommand")
    .f(RetrieveRequestFilterSensitiveLog, RetrieveResponseFilterSensitiveLog)
    .ser(se_RetrieveCommand)
    .de(de_RetrieveCommand)
    .build() {
}
