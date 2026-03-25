import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutSecretValueRequestFilterSensitiveLog, } from "../models/models_0";
import { de_PutSecretValueCommand, se_PutSecretValueCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class PutSecretValueCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "PutSecretValue", {})
    .n("SecretsManagerClient", "PutSecretValueCommand")
    .f(PutSecretValueRequestFilterSensitiveLog, void 0)
    .ser(se_PutSecretValueCommand)
    .de(de_PutSecretValueCommand)
    .build() {
}
