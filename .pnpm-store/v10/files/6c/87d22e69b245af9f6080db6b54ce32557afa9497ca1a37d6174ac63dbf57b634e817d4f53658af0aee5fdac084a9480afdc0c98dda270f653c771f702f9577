import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { Logout } from "../schemas/schemas_0";
export { $Command };
export class LogoutCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SWBPortalService", "Logout", {})
    .n("SSOClient", "LogoutCommand")
    .sc(Logout)
    .build() {
}
