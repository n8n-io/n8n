import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ListIdentityPools$ } from "../schemas/schemas_0";
export { $Command };
export class ListIdentityPoolsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "ListIdentityPools", {})
    .n("CognitoIdentityClient", "ListIdentityPoolsCommand")
    .sc(ListIdentityPools$)
    .build() {
}
