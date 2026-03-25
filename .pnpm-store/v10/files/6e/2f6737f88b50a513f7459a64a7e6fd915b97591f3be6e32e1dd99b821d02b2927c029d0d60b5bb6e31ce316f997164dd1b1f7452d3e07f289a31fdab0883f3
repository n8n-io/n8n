import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteBucketCommand, se_DeleteBucketCommand } from "../protocols/Aws_restXml";
export { $Command };
export class DeleteBucketCommand extends $Command
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
    .s("AmazonS3", "DeleteBucket", {})
    .n("S3Client", "DeleteBucketCommand")
    .f(void 0, void 0)
    .ser(se_DeleteBucketCommand)
    .de(de_DeleteBucketCommand)
    .build() {
}
