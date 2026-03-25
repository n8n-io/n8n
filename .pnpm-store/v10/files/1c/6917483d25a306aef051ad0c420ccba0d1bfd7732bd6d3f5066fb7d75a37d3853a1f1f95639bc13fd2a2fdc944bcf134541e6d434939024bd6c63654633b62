import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateExportJobRequestFilterSensitiveLog, } from "../models/models_0";
import { de_CreateExportJobCommand, se_CreateExportJobCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateExportJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateExportJob", {})
    .n("SESv2Client", "CreateExportJobCommand")
    .f(CreateExportJobRequestFilterSensitiveLog, void 0)
    .ser(se_CreateExportJobCommand)
    .de(de_CreateExportJobCommand)
    .build() {
}
