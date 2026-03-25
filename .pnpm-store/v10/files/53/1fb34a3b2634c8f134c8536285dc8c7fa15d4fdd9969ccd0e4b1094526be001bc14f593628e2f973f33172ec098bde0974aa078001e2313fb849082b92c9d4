import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteDedicatedIpPoolCommand, se_DeleteDedicatedIpPoolCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class DeleteDedicatedIpPoolCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteDedicatedIpPool", {})
    .n("SESv2Client", "DeleteDedicatedIpPoolCommand")
    .f(void 0, void 0)
    .ser(se_DeleteDedicatedIpPoolCommand)
    .de(de_DeleteDedicatedIpPoolCommand)
    .build() {
}
