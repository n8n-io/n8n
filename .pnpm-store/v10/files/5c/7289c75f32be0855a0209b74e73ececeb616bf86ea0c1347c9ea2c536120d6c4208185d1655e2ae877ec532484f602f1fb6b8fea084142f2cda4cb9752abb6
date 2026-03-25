import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateWorkforceRequestFilterSensitiveLog, } from "../models/models_2";
import { de_CreateWorkforceCommand, se_CreateWorkforceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateWorkforce", {})
    .n("SageMakerClient", "CreateWorkforceCommand")
    .f(CreateWorkforceRequestFilterSensitiveLog, void 0)
    .ser(se_CreateWorkforceCommand)
    .de(de_CreateWorkforceCommand)
    .build() {
}
