import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { LookupDeveloperIdentity$ } from "../schemas/schemas_0";
export { $Command };
export class LookupDeveloperIdentityCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "LookupDeveloperIdentity", {})
    .n("CognitoIdentityClient", "LookupDeveloperIdentityCommand")
    .sc(LookupDeveloperIdentity$)
    .build() {
}
