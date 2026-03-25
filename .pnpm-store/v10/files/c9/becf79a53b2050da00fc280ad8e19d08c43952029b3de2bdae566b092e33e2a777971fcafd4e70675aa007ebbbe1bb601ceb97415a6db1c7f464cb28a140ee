import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateTenantCommand, se_CreateTenantCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateTenantCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateTenant", {})
    .n("SESv2Client", "CreateTenantCommand")
    .f(void 0, void 0)
    .ser(se_CreateTenantCommand)
    .de(de_CreateTenantCommand)
    .build() {
}
