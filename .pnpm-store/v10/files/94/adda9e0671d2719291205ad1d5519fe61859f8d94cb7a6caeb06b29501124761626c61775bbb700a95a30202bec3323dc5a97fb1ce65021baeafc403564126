import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutSuppressedDestinationCommand, se_PutSuppressedDestinationCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class PutSuppressedDestinationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutSuppressedDestination", {})
    .n("SESv2Client", "PutSuppressedDestinationCommand")
    .f(void 0, void 0)
    .ser(se_PutSuppressedDestinationCommand)
    .de(de_PutSuppressedDestinationCommand)
    .build() {
}
