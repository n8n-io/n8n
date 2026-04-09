import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UntagResource$ } from "../schemas/schemas_0";
export { $Command };
export class UntagResourceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSCognitoIdentityService", "UntagResource", {})
    .n("CognitoIdentityClient", "UntagResourceCommand")
    .sc(UntagResource$)
    .build() {
}
