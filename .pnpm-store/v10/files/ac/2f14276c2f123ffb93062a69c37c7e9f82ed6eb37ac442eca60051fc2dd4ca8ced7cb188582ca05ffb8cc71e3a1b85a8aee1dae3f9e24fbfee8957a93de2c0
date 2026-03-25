import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetSecretValueResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GetSecretValueCommand, se_GetSecretValueCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetSecretValueCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "GetSecretValue", {})
    .n("SecretsManagerClient", "GetSecretValueCommand")
    .f(void 0, GetSecretValueResponseFilterSensitiveLog)
    .ser(se_GetSecretValueCommand)
    .de(de_GetSecretValueCommand)
    .build() {
}
