import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateSessionOutputFilterSensitiveLog, CreateSessionRequestFilterSensitiveLog, } from "../models/models_0";
import { de_CreateSessionCommand, se_CreateSessionCommand } from "../protocols/Aws_restXml";
export { $Command };
export class CreateSessionCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    DisableS3ExpressSessionAuth: { type: "staticContextParams", value: true },
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
    ];
})
    .s("AmazonS3", "CreateSession", {})
    .n("S3Client", "CreateSessionCommand")
    .f(CreateSessionRequestFilterSensitiveLog, CreateSessionOutputFilterSensitiveLog)
    .ser(se_CreateSessionCommand)
    .de(de_CreateSessionCommand)
    .build() {
}
