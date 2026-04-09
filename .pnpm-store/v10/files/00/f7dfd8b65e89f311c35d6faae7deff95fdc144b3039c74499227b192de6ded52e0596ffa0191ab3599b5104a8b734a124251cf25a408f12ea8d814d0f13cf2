import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { BatchGetDocumentStatus$ } from "../schemas/schemas_0";
export { $Command };
export class BatchGetDocumentStatusCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchGetDocumentStatus", {})
    .n("KendraClient", "BatchGetDocumentStatusCommand")
    .sc(BatchGetDocumentStatus$)
    .build() {
}
