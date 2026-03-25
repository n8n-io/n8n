import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { UploadPartCopyOutputFilterSensitiveLog, UploadPartCopyRequestFilterSensitiveLog, } from "../models/models_1";
import { de_UploadPartCopyCommand, se_UploadPartCopyCommand } from "../protocols/Aws_restXml";
export { $Command };
export class UploadPartCopyCommand extends $Command
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
        getSsecPlugin(config),
    ];
})
    .s("AmazonS3", "UploadPartCopy", {})
    .n("S3Client", "UploadPartCopyCommand")
    .f(UploadPartCopyRequestFilterSensitiveLog, UploadPartCopyOutputFilterSensitiveLog)
    .ser(se_UploadPartCopyCommand)
    .de(de_UploadPartCopyCommand)
    .build() {
}
