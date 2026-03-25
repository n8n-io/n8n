import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_BatchDeleteClusterNodesCommand, se_BatchDeleteClusterNodesCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class BatchDeleteClusterNodesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "BatchDeleteClusterNodes", {})
    .n("SageMakerClient", "BatchDeleteClusterNodesCommand")
    .f(void 0, void 0)
    .ser(se_BatchDeleteClusterNodesCommand)
    .de(de_BatchDeleteClusterNodesCommand)
    .build() {
}
