import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetModelPackageGroupPolicyCommand, se_GetModelPackageGroupPolicyCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class GetModelPackageGroupPolicyCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "GetModelPackageGroupPolicy", {})
    .n("SageMakerClient", "GetModelPackageGroupPolicyCommand")
    .f(void 0, void 0)
    .ser(se_GetModelPackageGroupPolicyCommand)
    .de(de_GetModelPackageGroupPolicyCommand)
    .build() {
}
