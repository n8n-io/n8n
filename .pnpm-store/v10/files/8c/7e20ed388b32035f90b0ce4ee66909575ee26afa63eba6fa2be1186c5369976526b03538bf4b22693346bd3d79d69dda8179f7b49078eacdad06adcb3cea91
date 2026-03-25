import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateEmailIdentityRequestFilterSensitiveLog, } from "../models/models_0";
import { de_CreateEmailIdentityCommand, se_CreateEmailIdentityCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateEmailIdentityCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateEmailIdentity", {})
    .n("SESv2Client", "CreateEmailIdentityCommand")
    .f(CreateEmailIdentityRequestFilterSensitiveLog, void 0)
    .ser(se_CreateEmailIdentityCommand)
    .de(de_CreateEmailIdentityCommand)
    .build() {
}
