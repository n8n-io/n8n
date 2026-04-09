import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DeleteDomain$ } from "../schemas/schemas_0";
export { $Command };
export class DeleteDomainCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteDomain", {})
    .n("SageMakerClient", "DeleteDomainCommand")
    .sc(DeleteDomain$)
    .build() {
}
