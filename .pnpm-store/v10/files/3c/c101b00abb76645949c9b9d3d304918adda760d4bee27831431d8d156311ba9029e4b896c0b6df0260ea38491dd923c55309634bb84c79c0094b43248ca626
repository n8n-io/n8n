import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateIdentityPool$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateIdentityPoolCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UpdateIdentityPool", {})
    .n("CognitoIdentityClient", "UpdateIdentityPoolCommand")
    .sc(UpdateIdentityPool$)
    .build() {
}
