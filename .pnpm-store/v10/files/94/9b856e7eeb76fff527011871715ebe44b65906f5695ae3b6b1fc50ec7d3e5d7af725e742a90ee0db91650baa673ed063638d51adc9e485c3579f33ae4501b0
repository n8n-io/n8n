import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateModelPackageInputFilterSensitiveLog, } from "../models/models_5";
import { de_UpdateModelPackageCommand, se_UpdateModelPackageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class UpdateModelPackageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "UpdateModelPackage", {})
    .n("SageMakerClient", "UpdateModelPackageCommand")
    .f(UpdateModelPackageInputFilterSensitiveLog, void 0)
    .ser(se_UpdateModelPackageCommand)
    .de(de_UpdateModelPackageCommand)
    .build() {
}
