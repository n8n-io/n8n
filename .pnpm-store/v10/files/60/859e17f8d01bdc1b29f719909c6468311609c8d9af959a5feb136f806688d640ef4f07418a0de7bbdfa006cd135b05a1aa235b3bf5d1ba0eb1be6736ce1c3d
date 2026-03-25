import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetExportJobResponseFilterSensitiveLog } from "../models/models_0";
import { de_GetExportJobCommand, se_GetExportJobCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class GetExportJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetExportJob", {})
    .n("SESv2Client", "GetExportJobCommand")
    .f(void 0, GetExportJobResponseFilterSensitiveLog)
    .ser(se_GetExportJobCommand)
    .de(de_GetExportJobCommand)
    .build() {
}
