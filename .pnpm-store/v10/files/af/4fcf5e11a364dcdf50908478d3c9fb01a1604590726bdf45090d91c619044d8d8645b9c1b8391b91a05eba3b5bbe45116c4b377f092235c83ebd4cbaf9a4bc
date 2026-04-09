import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { ImportHubContent$ } from "../schemas/schemas_0";
export { $Command };
export class ImportHubContentCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ImportHubContent", {})
    .n("SageMakerClient", "ImportHubContentCommand")
    .sc(ImportHubContent$)
    .build() {
}
