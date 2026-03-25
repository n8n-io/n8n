import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetDedicatedIpsCommand, se_GetDedicatedIpsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetDedicatedIpsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDedicatedIps", {})
    .n("SESv2Client", "GetDedicatedIpsCommand")
    .f(void 0, void 0)
    .ser(se_GetDedicatedIpsCommand)
    .de(de_GetDedicatedIpsCommand)
    .build() {
}
