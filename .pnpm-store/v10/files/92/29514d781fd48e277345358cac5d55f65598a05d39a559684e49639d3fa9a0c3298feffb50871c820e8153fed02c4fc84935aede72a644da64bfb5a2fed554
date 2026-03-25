import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateFeatureGroupCommand, se_CreateFeatureGroupCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class CreateFeatureGroupCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "CreateFeatureGroup", {})
    .n("SageMakerClient", "CreateFeatureGroupCommand")
    .f(void 0, void 0)
    .ser(se_CreateFeatureGroupCommand)
    .de(de_CreateFeatureGroupCommand)
    .build() {
}
