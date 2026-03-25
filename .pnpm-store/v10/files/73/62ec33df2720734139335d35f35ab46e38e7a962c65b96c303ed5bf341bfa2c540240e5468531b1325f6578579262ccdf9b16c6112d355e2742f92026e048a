import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateIndexRequestFilterSensitiveLog } from "../models/models_0";
import { de_CreateIndexCommand, se_CreateIndexCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateIndexCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "CreateIndex", {})
    .n("KendraClient", "CreateIndexCommand")
    .f(CreateIndexRequestFilterSensitiveLog, void 0)
    .ser(se_CreateIndexCommand)
    .de(de_CreateIndexCommand)
    .build() {
}
