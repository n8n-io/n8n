import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateModelCardRequestFilterSensitiveLog, } from "../models/models_5";
import { de_UpdateModelCardCommand, se_UpdateModelCardCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateModelCardCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateModelCard", {})
    .n("SageMakerClient", "UpdateModelCardCommand")
    .f(UpdateModelCardRequestFilterSensitiveLog, void 0)
    .ser(se_UpdateModelCardCommand)
    .de(de_UpdateModelCardCommand)
    .build() {
}
