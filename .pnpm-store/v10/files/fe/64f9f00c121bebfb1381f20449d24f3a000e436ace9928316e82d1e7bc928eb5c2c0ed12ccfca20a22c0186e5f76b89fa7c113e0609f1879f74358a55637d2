import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetModelPackageGroupPolicy$ } from "../schemas/schemas_0";
export { $Command };
export class GetModelPackageGroupPolicyCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetModelPackageGroupPolicy", {})
    .n("SageMakerClient", "GetModelPackageGroupPolicyCommand")
    .sc(GetModelPackageGroupPolicy$)
    .build() {
}
