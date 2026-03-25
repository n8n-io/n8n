import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateImportJobCommand, se_CreateImportJobCommand } from "../protocols/Aws_restJson1";
export { $Command };
export class CreateImportJobCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateImportJob", {})
    .n("SESv2Client", "CreateImportJobCommand")
    .f(void 0, void 0)
    .ser(se_CreateImportJobCommand)
    .de(de_CreateImportJobCommand)
    .build() {
}
