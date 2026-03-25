import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetBucketEncryptionOutputFilterSensitiveLog, } from "../models/models_0";
import { de_GetBucketEncryptionCommand, se_GetBucketEncryptionCommand } from "../protocols/Aws_restXml";
export { $Command };
export class GetBucketEncryptionCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
    ];
})
    .s("AmazonS3", "GetBucketEncryption", {})
    .n("S3Client", "GetBucketEncryptionCommand")
    .f(void 0, GetBucketEncryptionOutputFilterSensitiveLog)
    .ser(se_GetBucketEncryptionCommand)
    .de(de_GetBucketEncryptionCommand)
    .build() {
}
