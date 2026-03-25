import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetCredentialsForIdentityInputFilterSensitiveLog, GetCredentialsForIdentityResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GetCredentialsForIdentityCommand, se_GetCredentialsForIdentityCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetCredentialsForIdentityCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSCognitoIdentityService", "GetCredentialsForIdentity", {})
    .n("CognitoIdentityClient", "GetCredentialsForIdentityCommand")
    .f(GetCredentialsForIdentityInputFilterSensitiveLog, GetCredentialsForIdentityResponseFilterSensitiveLog)
    .ser(se_GetCredentialsForIdentityCommand)
    .de(de_GetCredentialsForIdentityCommand)
    .build() {
}
