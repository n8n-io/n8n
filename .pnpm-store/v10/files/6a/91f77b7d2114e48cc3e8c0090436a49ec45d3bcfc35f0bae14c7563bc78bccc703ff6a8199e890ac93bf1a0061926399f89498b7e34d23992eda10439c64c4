import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { BatchGetSecretValueResponseFilterSensitiveLog, } from "../models/models_0";
import { de_BatchGetSecretValueCommand, se_BatchGetSecretValueCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class BatchGetSecretValueCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("secretsmanager", "BatchGetSecretValue", {})
    .n("SecretsManagerClient", "BatchGetSecretValueCommand")
    .f(void 0, BatchGetSecretValueResponseFilterSensitiveLog)
    .ser(se_BatchGetSecretValueCommand)
    .de(de_BatchGetSecretValueCommand)
    .build() {
}
