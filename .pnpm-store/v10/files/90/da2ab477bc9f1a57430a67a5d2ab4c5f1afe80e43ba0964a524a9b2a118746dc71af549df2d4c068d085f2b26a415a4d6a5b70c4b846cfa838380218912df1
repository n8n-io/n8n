import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DescribeMonitoringScheduleCommand, se_DescribeMonitoringScheduleCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class DescribeMonitoringScheduleCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "DescribeMonitoringSchedule", {})
    .n("SageMakerClient", "DescribeMonitoringScheduleCommand")
    .f(void 0, void 0)
    .ser(se_DescribeMonitoringScheduleCommand)
    .de(de_DescribeMonitoringScheduleCommand)
    .build() {
}
