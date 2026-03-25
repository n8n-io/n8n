import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteBucketWebsiteCommand, se_DeleteBucketWebsiteCommand } from "../protocols/Aws_restXml";
export { $Command };
export class DeleteBucketWebsiteCommand extends $Command
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
    .s("AmazonS3", "DeleteBucketWebsite", {})
    .n("S3Client", "DeleteBucketWebsiteCommand")
    .f(void 0, void 0)
    .ser(se_DeleteBucketWebsiteCommand)
    .de(de_DeleteBucketWebsiteCommand)
    .build() {
}
