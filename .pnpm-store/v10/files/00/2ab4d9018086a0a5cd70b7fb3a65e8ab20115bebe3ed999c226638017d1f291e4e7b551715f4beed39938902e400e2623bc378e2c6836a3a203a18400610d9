import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { PutBucketInventoryConfigurationRequestFilterSensitiveLog, } from "../models/models_1";
import { de_PutBucketInventoryConfigurationCommand, se_PutBucketInventoryConfigurationCommand, } from "../protocols/Aws_restXml";
export { $Command };
export class PutBucketInventoryConfigurationCommand extends $Command
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
    .s("AmazonS3", "PutBucketInventoryConfiguration", {})
    .n("S3Client", "PutBucketInventoryConfigurationCommand")
    .f(PutBucketInventoryConfigurationRequestFilterSensitiveLog, void 0)
    .ser(se_PutBucketInventoryConfigurationCommand)
    .de(de_PutBucketInventoryConfigurationCommand)
    .build() {
}
