import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateModelPackageInputFilterSensitiveLog, } from "../models/models_1";
import { de_CreateModelPackageCommand, se_CreateModelPackageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateModelPackageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateModelPackage", {})
    .n("SageMakerClient", "CreateModelPackageCommand")
    .f(CreateModelPackageInputFilterSensitiveLog, void 0)
    .ser(se_CreateModelPackageCommand)
    .de(de_CreateModelPackageCommand)
    .build() {
}
