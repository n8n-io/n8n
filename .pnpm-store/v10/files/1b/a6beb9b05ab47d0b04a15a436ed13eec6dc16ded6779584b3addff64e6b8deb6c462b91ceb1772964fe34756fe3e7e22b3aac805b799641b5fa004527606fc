import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetSnapshotsCommand, se_GetSnapshotsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetSnapshotsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "GetSnapshots", {})
    .n("KendraClient", "GetSnapshotsCommand")
    .f(void 0, void 0)
    .ser(se_GetSnapshotsCommand)
    .de(de_GetSnapshotsCommand)
    .build() {
}
