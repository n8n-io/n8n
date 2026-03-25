import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetDedicatedIpCommand, se_GetDedicatedIpCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetDedicatedIpCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDedicatedIp", {})
    .n("SESv2Client", "GetDedicatedIpCommand")
    .f(void 0, void 0)
    .ser(se_GetDedicatedIpCommand)
    .de(de_GetDedicatedIpCommand)
    .build() {
}
