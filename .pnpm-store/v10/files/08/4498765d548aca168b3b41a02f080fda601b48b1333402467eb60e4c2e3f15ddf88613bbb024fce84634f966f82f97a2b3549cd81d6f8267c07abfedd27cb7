import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetScalingConfigurationRecommendationCommand, se_GetScalingConfigurationRecommendationCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class GetScalingConfigurationRecommendationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "GetScalingConfigurationRecommendation", {})
    .n("SageMakerClient", "GetScalingConfigurationRecommendationCommand")
    .f(void 0, void 0)
    .ser(se_GetScalingConfigurationRecommendationCommand)
    .de(de_GetScalingConfigurationRecommendationCommand)
    .build() {
}
