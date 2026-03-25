import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateSecretRequestFilterSensitiveLog } from "../models/models_0";
import { de_CreateSecretCommand, se_CreateSecretCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateSecretCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "CreateSecret", {})
    .n("SecretsManagerClient", "CreateSecretCommand")
    .f(CreateSecretRequestFilterSensitiveLog, void 0)
    .ser(se_CreateSecretCommand)
    .de(de_CreateSecretCommand)
    .build() {
}
