import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetPrincipalTagAttributeMap$ } from "../schemas/schemas_0";
export { $Command };
export class GetPrincipalTagAttributeMapCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "GetPrincipalTagAttributeMap", {})
    .n("CognitoIdentityClient", "GetPrincipalTagAttributeMapCommand")
    .sc(GetPrincipalTagAttributeMap$)
    .build() {
}
