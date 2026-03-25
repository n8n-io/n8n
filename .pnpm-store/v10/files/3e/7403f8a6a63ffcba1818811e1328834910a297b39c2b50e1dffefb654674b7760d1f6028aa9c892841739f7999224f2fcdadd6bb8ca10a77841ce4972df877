import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateWorkforceRequestFilterSensitiveLog, } from "../models/models_5";
import { de_UpdateWorkforceCommand, se_UpdateWorkforceCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateWorkforceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateWorkforce", {})
    .n("SageMakerClient", "UpdateWorkforceCommand")
    .f(UpdateWorkforceRequestFilterSensitiveLog, void 0)
    .ser(se_UpdateWorkforceCommand)
    .de(de_UpdateWorkforceCommand)
    .build() {
}
