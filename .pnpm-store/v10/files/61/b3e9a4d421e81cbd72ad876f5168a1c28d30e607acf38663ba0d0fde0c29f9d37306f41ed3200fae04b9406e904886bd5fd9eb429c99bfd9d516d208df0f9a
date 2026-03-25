import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutDedicatedIpPoolScalingAttributesCommand, se_PutDedicatedIpPoolScalingAttributesCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class PutDedicatedIpPoolScalingAttributesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutDedicatedIpPoolScalingAttributes", {})
    .n("SESv2Client", "PutDedicatedIpPoolScalingAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutDedicatedIpPoolScalingAttributesCommand)
    .de(de_PutDedicatedIpPoolScalingAttributesCommand)
    .build() {
}
