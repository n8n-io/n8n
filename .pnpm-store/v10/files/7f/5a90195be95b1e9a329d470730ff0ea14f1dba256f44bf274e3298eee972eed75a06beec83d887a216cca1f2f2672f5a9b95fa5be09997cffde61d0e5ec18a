import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeModelPackageGroupCommand, se_DescribeModelPackageGroupCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeModelPackageGroupCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeModelPackageGroup", {})
    .n("SageMakerClient", "DescribeModelPackageGroupCommand")
    .f(void 0, void 0)
    .ser(se_DescribeModelPackageGroupCommand)
    .de(de_DescribeModelPackageGroupCommand)
    .build() {
}
