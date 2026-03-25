import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListBucketsCommand, se_ListBucketsCommand } from "../protocols/Aws_restXml";
export { $Command };
export class ListBucketsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
    ];
})
    .s("AmazonS3", "ListBuckets", {})
    .n("S3Client", "ListBucketsCommand")
    .f(void 0, void 0)
    .ser(se_ListBucketsCommand)
    .de(de_ListBucketsCommand)
    .build() {
}
