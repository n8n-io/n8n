import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateDataSource$ } from "../schemas/schemas_0";
export { $Command };
export class CreateDataSourceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateDataSource", {})
    .n("KendraClient", "CreateDataSourceCommand")
    .sc(CreateDataSource$)
    .build() {
}
