import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetRandomPasswordResponseFilterSensitiveLog, } from "../models/models_0";
import { de_GetRandomPasswordCommand, se_GetRandomPasswordCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetRandomPasswordCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "GetRandomPassword", {})
    .n("SecretsManagerClient", "GetRandomPasswordCommand")
    .f(void 0, GetRandomPasswordResponseFilterSensitiveLog)
    .ser(se_GetRandomPasswordCommand)
    .de(de_GetRandomPasswordCommand)
    .build() {
}
