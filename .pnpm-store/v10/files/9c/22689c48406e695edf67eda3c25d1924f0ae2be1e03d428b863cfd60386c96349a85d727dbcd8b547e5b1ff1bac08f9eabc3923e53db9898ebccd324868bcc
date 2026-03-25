import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteDeviceFleetCommand, se_DeleteDeviceFleetCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteDeviceFleetCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DeleteDeviceFleet", {})
    .n("SageMakerClient", "DeleteDeviceFleetCommand")
    .f(void 0, void 0)
    .ser(se_DeleteDeviceFleetCommand)
    .de(de_DeleteDeviceFleetCommand)
    .build() {
}
