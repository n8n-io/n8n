import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_AbortMultipartUploadCommand, se_AbortMultipartUploadCommand } from "../protocols/Aws_restXml";
export { $Command };
export class AbortMultipartUploadCommand extends $Command
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
    ];
})
    .s("AmazonS3", "AbortMultipartUpload", {})
    .n("S3Client", "AbortMultipartUploadCommand")
    .f(void 0, void 0)
    .ser(se_AbortMultipartUploadCommand)
    .de(de_AbortMultipartUploadCommand)
    .build() {
}
