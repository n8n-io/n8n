import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteBucketPolicyCommand, se_DeleteBucketPolicyCommand } from "../protocols/Aws_restXml";
export { $Command };
export class DeleteBucketPolicyCommand extends $Command
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
    .s("AmazonS3", "DeleteBucketPolicy", {})
    .n("S3Client", "DeleteBucketPolicyCommand")
    .f(void 0, void 0)
    .ser(se_DeleteBucketPolicyCommand)
    .de(de_DeleteBucketPolicyCommand)
    .build() {
}
