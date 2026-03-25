import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetBucketInventoryConfigurationOutputFilterSensitiveLog, } from "../models/models_0";
import { de_GetBucketInventoryConfigurationCommand, se_GetBucketInventoryConfigurationCommand, } from "../protocols/Aws_restXml";
export { $Command };
export class GetBucketInventoryConfigurationCommand extends $Command
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
    .s("AmazonS3", "GetBucketInventoryConfiguration", {})
    .n("S3Client", "GetBucketInventoryConfigurationCommand")
    .f(void 0, GetBucketInventoryConfigurationOutputFilterSensitiveLog)
    .ser(se_GetBucketInventoryConfigurationCommand)
    .de(de_GetBucketInventoryConfigurationCommand)
    .build() {
}
