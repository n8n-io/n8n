import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListTrainingJobsForHyperParameterTuningJobCommand, se_ListTrainingJobsForHyperParameterTuningJobCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class ListTrainingJobsForHyperParameterTuningJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListTrainingJobsForHyperParameterTuningJob", {})
    .n("SageMakerClient", "ListTrainingJobsForHyperParameterTuningJobCommand")
    .f(void 0, void 0)
    .ser(se_ListTrainingJobsForHyperParameterTuningJobCommand)
    .de(de_ListTrainingJobsForHyperParameterTuningJobCommand)
    .build() {
}
