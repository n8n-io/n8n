import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { AddAssociation$ } from "../schemas/schemas_0";
export { $Command };
export class AddAssociationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AddAssociation", {})
    .n("SageMakerClient", "AddAssociationCommand")
    .sc(AddAssociation$)
    .build() {
}
