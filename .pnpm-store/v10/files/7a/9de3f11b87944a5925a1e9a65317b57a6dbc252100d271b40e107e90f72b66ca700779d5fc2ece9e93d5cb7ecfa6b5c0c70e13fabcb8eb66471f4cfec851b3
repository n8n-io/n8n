import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_BatchGetDocumentStatusCommand, se_BatchGetDocumentStatusCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class BatchGetDocumentStatusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "BatchGetDocumentStatus", {})
    .n("KendraClient", "BatchGetDocumentStatusCommand")
    .f(void 0, void 0)
    .ser(se_BatchGetDocumentStatusCommand)
    .de(de_BatchGetDocumentStatusCommand)
    .build() {
}
