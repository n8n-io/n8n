import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { DescribeModelPackageOutputFilterSensitiveLog, } from "../models/models_3";
import { de_DescribeModelPackageCommand, se_DescribeModelPackageCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeModelPackageCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeModelPackage", {})
    .n("SageMakerClient", "DescribeModelPackageCommand")
    .f(void 0, DescribeModelPackageOutputFilterSensitiveLog)
    .ser(se_DescribeModelPackageCommand)
    .de(de_DescribeModelPackageCommand)
    .build() {
}
