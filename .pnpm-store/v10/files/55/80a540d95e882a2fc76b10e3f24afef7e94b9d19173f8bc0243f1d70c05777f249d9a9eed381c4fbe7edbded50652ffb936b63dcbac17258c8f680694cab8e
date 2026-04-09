import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetOpenIdToken$ } from "../schemas/schemas_0";
export { $Command };
export class GetOpenIdTokenCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetOpenIdToken", {})
    .n("CognitoIdentityClient", "GetOpenIdTokenCommand")
    .sc(GetOpenIdToken$)
    .build() {
}
