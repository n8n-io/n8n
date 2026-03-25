import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteBucketAnalyticsConfigurationCommand, se_DeleteBucketAnalyticsConfigurationCommand, } from "../protocols/Aws_restXml";
export { $Command };
export class DeleteBucketAnalyticsConfigurationCommand extends $Command
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
    .s("AmazonS3", "DeleteBucketAnalyticsConfiguration", {})
    .n("S3Client", "DeleteBucketAnalyticsConfigurationCommand")
    .f(void 0, void 0)
    .ser(se_DeleteBucketAnalyticsConfigurationCommand)
    .de(de_DeleteBucketAnalyticsConfigurationCommand)
    .build() {
}
