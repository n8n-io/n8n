import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateModelPackage$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateModelPackageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateModelPackage", {})
    .n("SageMakerClient", "UpdateModelPackageCommand")
    .sc(UpdateModelPackage$)
    .build() {
}
