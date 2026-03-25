import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_GetBucketOwnershipControlsCommand, se_GetBucketOwnershipControlsCommand } from "../protocols/Aws_restXml";
export { $Command };
export class GetBucketOwnershipControlsCommand extends $Command
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
    .s("AmazonS3", "GetBucketOwnershipControls", {})
    .n("S3Client", "GetBucketOwnershipControlsCommand")
    .f(void 0, void 0)
    .ser(se_GetBucketOwnershipControlsCommand)
    .de(de_GetBucketOwnershipControlsCommand)
    .build() {
}
