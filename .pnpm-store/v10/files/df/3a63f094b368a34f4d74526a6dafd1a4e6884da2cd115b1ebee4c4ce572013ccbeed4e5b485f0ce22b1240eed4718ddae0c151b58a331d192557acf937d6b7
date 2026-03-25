import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateMultiRegionEndpointCommand, se_CreateMultiRegionEndpointCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateMultiRegionEndpointCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateMultiRegionEndpoint", {})
    .n("SESv2Client", "CreateMultiRegionEndpointCommand")
    .f(void 0, void 0)
    .ser(se_CreateMultiRegionEndpointCommand)
    .de(de_CreateMultiRegionEndpointCommand)
    .build() {
}
