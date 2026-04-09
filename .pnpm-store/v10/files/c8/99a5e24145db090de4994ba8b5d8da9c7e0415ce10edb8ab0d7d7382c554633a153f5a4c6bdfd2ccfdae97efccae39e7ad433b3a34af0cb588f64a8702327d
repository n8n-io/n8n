import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateIdentityPool$ } from "../schemas/schemas_0";
export { $Command };
export class CreateIdentityPoolCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "CreateIdentityPool", {})
    .n("CognitoIdentityClient", "CreateIdentityPoolCommand")
    .sc(CreateIdentityPool$)
    .build() {
}
