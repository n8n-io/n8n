import { getS3ExpiresMiddlewarePlugin, getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { HeadObjectOutputFilterSensitiveLog, HeadObjectRequestFilterSensitiveLog, } from "../models/models_0";
import { de_HeadObjectCommand, se_HeadObjectCommand } from "../protocols/Aws_restXml";
export { $Command };
export class HeadObjectCommand extends $Command
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
        getS3ExpiresMiddlewarePlugin(config),
    ];
})
    .s("AmazonS3", "HeadObject", {})
    .n("S3Client", "HeadObjectCommand")
    .f(HeadObjectRequestFilterSensitiveLog, HeadObjectOutputFilterSensitiveLog)
    .ser(se_HeadObjectCommand)
    .de(de_HeadObjectCommand)
    .build() {
}
