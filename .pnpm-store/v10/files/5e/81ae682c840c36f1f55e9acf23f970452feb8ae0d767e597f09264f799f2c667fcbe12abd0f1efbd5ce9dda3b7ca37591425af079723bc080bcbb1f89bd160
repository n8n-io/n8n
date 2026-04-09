import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreatePresignedMlflowAppUrl$ } from "../schemas/schemas_0";
export { $Command };
export class CreatePresignedMlflowAppUrlCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePresignedMlflowAppUrl", {})
    .n("SageMakerClient", "CreatePresignedMlflowAppUrlCommand")
    .sc(CreatePresignedMlflowAppUrl$)
    .build() {
}
