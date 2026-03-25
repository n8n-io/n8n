import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { CreateMultipartUploadOutputFilterSensitiveLog, CreateMultipartUploadRequestFilterSensitiveLog, } from "../models/models_0";
import { de_CreateMultipartUploadCommand, se_CreateMultipartUploadCommand } from "../protocols/Aws_restXml";
export { $Command };
export class CreateMultipartUploadCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    Bucket: { type: "contextParams", name: "Bucket" },
    Key: { type: "contextParams", name: "Key" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
        getSsecPlugin(config),
    ];
})
    .s("AmazonS3", "CreateMultipartUpload", {})
    .n("S3Client", "CreateMultipartUploadCommand")
    .f(CreateMultipartUploadRequestFilterSensitiveLog, CreateMultipartUploadOutputFilterSensitiveLog)
    .ser(se_CreateMultipartUploadCommand)
    .de(de_CreateMultipartUploadCommand)
    .build() {
}
