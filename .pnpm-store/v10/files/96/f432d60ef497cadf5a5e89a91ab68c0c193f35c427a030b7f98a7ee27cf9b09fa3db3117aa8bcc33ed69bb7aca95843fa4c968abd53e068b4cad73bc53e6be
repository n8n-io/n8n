import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_PutBucketAnalyticsConfigurationCommand, se_PutBucketAnalyticsConfigurationCommand, } from "../protocols/Aws_restXml";
export { $Command };
export class PutBucketAnalyticsConfigurationCommand extends $Command
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
    .s("AmazonS3", "PutBucketAnalyticsConfiguration", {})
    .n("S3Client", "PutBucketAnalyticsConfigurationCommand")
    .f(void 0, void 0)
    .ser(se_PutBucketAnalyticsConfigurationCommand)
    .de(de_PutBucketAnalyticsConfigurationCommand)
    .build() {
}
