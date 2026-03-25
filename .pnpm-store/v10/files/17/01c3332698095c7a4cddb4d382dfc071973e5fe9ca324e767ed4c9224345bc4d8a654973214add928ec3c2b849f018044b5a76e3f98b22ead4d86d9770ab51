import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_RegisterDevicesCommand, se_RegisterDevicesCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class RegisterDevicesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "RegisterDevices", {})
    .n("SageMakerClient", "RegisterDevicesCommand")
    .f(void 0, void 0)
    .ser(se_RegisterDevicesCommand)
    .de(de_RegisterDevicesCommand)
    .build() {
}
