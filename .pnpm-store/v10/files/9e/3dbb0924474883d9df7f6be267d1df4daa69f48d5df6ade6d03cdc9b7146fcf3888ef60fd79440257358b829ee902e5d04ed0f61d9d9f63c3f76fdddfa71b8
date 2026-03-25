import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeFeatureMetadataCommand, se_DescribeFeatureMetadataCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeFeatureMetadataCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeFeatureMetadata", {})
    .n("SageMakerClient", "DescribeFeatureMetadataCommand")
    .f(void 0, void 0)
    .ser(se_DescribeFeatureMetadataCommand)
    .de(de_DescribeFeatureMetadataCommand)
    .build() {
}
