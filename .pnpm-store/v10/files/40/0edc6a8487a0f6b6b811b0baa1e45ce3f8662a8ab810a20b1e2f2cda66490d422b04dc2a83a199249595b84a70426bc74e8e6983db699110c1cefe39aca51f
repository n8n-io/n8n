import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutBucketNotificationConfigurationCommand, se_PutBucketNotificationConfigurationCommand, } from "../protocols/Aws_restXml";
export { $Command };
export class PutBucketNotificationConfigurationCommand extends $Command
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
    ];
})
    .s("AmazonS3", "PutBucketNotificationConfiguration", {})
    .n("S3Client", "PutBucketNotificationConfigurationCommand")
    .f(void 0, void 0)
    .ser(se_PutBucketNotificationConfigurationCommand)
    .de(de_PutBucketNotificationConfigurationCommand)
    .build() {
}
