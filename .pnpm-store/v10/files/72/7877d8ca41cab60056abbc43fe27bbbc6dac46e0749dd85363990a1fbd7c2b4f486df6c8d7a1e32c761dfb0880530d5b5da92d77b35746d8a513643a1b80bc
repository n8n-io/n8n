import { getFlexibleChecksumsPlugin } from "@aws-sdk/middleware-flexible-checksums";
import { getS3ExpiresMiddlewarePlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetObjectOutputFilterSensitiveLog, GetObjectRequestFilterSensitiveLog, } from "../models/models_0";
import { de_GetObjectCommand, se_GetObjectCommand } from "../protocols/Aws_restXml";
export { $Command };
export class GetObjectCommand extends $Command
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
            requestChecksumRequired: false,
            requestValidationModeMember: "ChecksumMode",
            responseAlgorithms: ["CRC64NVME", "CRC32", "CRC32C", "SHA256", "SHA1"],
        }),
        getSsecPlugin(config),
        getS3ExpiresMiddlewarePlugin(config),
    ];
})
    .s("AmazonS3", "GetObject", {})
    .n("S3Client", "GetObjectCommand")
    .f(GetObjectRequestFilterSensitiveLog, GetObjectOutputFilterSensitiveLog)
    .ser(se_GetObjectCommand)
    .de(de_GetObjectCommand)
    .build() {
}
