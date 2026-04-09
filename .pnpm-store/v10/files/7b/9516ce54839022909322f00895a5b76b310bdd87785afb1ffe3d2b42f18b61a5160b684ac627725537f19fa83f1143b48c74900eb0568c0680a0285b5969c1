import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteDataSource$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteDataSourceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteDataSource", {})
    .n("KendraClient", "DeleteDataSourceCommand")
    .sc(DeleteDataSource$)
    .build() {
}
