import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateFeatureGroup$ } from "../schemas/schemas_0";
export { $Command };
export class CreateFeatureGroupCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateFeatureGroup", {})
    .n("SageMakerClient", "CreateFeatureGroupCommand")
    .sc(CreateFeatureGroup$)
    .build() {
}
