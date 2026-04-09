import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteSpace$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteSpaceCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteSpace", {})
    .n("SageMakerClient", "DeleteSpaceCommand")
    .sc(DeleteSpace$)
    .build() {
}
