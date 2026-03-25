import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_RotateSecretCommand, se_RotateSecretCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class RotateSecretCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "RotateSecret", {})
    .n("SecretsManagerClient", "RotateSecretCommand")
    .f(void 0, void 0)
    .ser(se_RotateSecretCommand)
    .de(de_RotateSecretCommand)
    .build() {
}
