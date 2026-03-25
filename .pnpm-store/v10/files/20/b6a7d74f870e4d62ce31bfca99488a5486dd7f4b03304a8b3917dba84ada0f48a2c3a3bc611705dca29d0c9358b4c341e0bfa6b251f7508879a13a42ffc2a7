import { getFlexibleChecksumsPlugin } from "@aws-sdk/middleware-flexible-checksums";
import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutObjectLockConfigurationCommand, se_PutObjectLockConfigurationCommand } from "../protocols/Aws_restXml";
export { $Command };
export class PutObjectLockConfigurationCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getFlexibleChecksumsPlugin(config, {
            requestAlgorithmMember: { httpHeader: "x-amz-sdk-checksum-algorithm", name: "ChecksumAlgorithm" },
            requestChecksumRequired: true,
        }),
        getThrow200ExceptionsPlugin(config),
    ];
})
    .s("AmazonS3", "PutObjectLockConfiguration", {})
    .n("S3Client", "PutObjectLockConfigurationCommand")
    .f(void 0, void 0)
    .ser(se_PutObjectLockConfigurationCommand)
    .de(de_PutObjectLockConfigurationCommand)
    .build() {
}
