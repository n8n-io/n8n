import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteAssociation$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteAssociationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAssociation", {})
    .n("SageMakerClient", "DeleteAssociationCommand")
    .sc(DeleteAssociation$)
    .build() {
}
