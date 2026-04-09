import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetSnapshots$ } from "../schemas/schemas_0";
export { $Command };
export class GetSnapshotsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "GetSnapshots", {})
    .n("KendraClient", "GetSnapshotsCommand")
    .sc(GetSnapshots$)
    .build() {
}
