import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UpdateHubContent$ } from "../schemas/schemas_0";
export { $Command };
export class UpdateHubContentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateHubContent", {})
    .n("SageMakerClient", "UpdateHubContentCommand")
    .sc(UpdateHubContent$)
    .build() {
}
