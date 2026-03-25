import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateSecretRequestFilterSensitiveLog } from "../models/models_0";
import { de_UpdateSecretCommand, se_UpdateSecretCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateSecretCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "UpdateSecret", {})
    .n("SecretsManagerClient", "UpdateSecretCommand")
    .f(UpdateSecretRequestFilterSensitiveLog, void 0)
    .ser(se_UpdateSecretCommand)
    .de(de_UpdateSecretCommand)
    .build() {
}
