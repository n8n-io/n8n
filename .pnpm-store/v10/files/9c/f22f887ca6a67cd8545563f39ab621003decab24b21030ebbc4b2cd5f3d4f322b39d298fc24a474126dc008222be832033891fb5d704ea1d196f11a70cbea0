import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateModelCardRequestFilterSensitiveLog, } from "../models/models_1";
import { de_CreateModelCardCommand, se_CreateModelCardCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateModelCardCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateModelCard", {})
    .n("SageMakerClient", "CreateModelCardCommand")
    .f(CreateModelCardRequestFilterSensitiveLog, void 0)
    .ser(se_CreateModelCardCommand)
    .de(de_CreateModelCardCommand)
    .build() {
}
