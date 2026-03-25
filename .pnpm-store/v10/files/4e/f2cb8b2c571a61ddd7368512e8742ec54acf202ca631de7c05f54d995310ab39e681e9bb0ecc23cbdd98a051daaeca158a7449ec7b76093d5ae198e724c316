import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { WriteGetObjectResponseRequestFilterSensitiveLog } from "../models/models_1";
import { de_WriteGetObjectResponseCommand, se_WriteGetObjectResponseCommand } from "../protocols/Aws_restXml";
export { $Command };
export class WriteGetObjectResponseCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    UseObjectLambdaEndpoint: { type: "staticContextParams", value: true },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonS3", "WriteGetObjectResponse", {})
    .n("S3Client", "WriteGetObjectResponseCommand")
    .f(WriteGetObjectResponseRequestFilterSensitiveLog, void 0)
    .ser(se_WriteGetObjectResponseCommand)
    .de(de_WriteGetObjectResponseCommand)
    .build() {
}
