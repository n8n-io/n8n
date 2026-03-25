import { getLocationConstraintPlugin } from "@aws-sdk/middleware-location-constraint";
import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_CreateBucketCommand, se_CreateBucketCommand } from "../protocols/Aws_restXml";
export { $Command };
export class CreateBucketCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
    DisableAccessPoints: { type: "staticContextParams", value: true },
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
        getLocationConstraintPlugin(config),
    ];
})
    .s("AmazonS3", "CreateBucket", {})
    .n("S3Client", "CreateBucketCommand")
    .f(void 0, void 0)
    .ser(se_CreateBucketCommand)
    .de(de_CreateBucketCommand)
    .build() {
}
