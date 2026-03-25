import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateDataSourceCommand, se_CreateDataSourceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateDataSourceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "CreateDataSource", {})
    .n("KendraClient", "CreateDataSourceCommand")
    .f(void 0, void 0)
    .ser(se_CreateDataSourceCommand)
    .de(de_CreateDataSourceCommand)
    .build() {
}
