import { getFlexibleChecksumsPlugin } from "@aws-sdk/middleware-flexible-checksums";
import { getCheckContentLengthHeaderPlugin, getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutObjectOutputFilterSensitiveLog, PutObjectRequestFilterSensitiveLog, } from "../models/models_1";
import { de_PutObjectCommand, se_PutObjectCommand } from "../protocols/Aws_restXml";
export { $Command };
export class PutObjectCommand extends $Command
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
        getFlexibleChecksumsPlugin(config, {
            requestAlgorithmMember: { httpHeader: "x-amz-sdk-checksum-algorithm", name: "ChecksumAlgorithm" },
            requestChecksumRequired: false,
        }),
        getCheckContentLengthHeaderPlugin(config),
        getThrow200ExceptionsPlugin(config),
        getSsecPlugin(config),
    ];
})
    .s("AmazonS3", "PutObject", {})
    .n("S3Client", "PutObjectCommand")
    .f(PutObjectRequestFilterSensitiveLog, PutObjectOutputFilterSensitiveLog)
    .ser(se_PutObjectCommand)
    .de(de_PutObjectCommand)
    .build() {
}
