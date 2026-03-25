import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListResourceTenantsCommand, se_ListResourceTenantsCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class ListResourceTenantsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListResourceTenants", {})
    .n("SESv2Client", "ListResourceTenantsCommand")
    .f(void 0, void 0)
    .ser(se_ListResourceTenantsCommand)
    .de(de_ListResourceTenantsCommand)
    .build() {
}
