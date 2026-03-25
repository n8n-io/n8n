import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { SelectObjectContentOutputFilterSensitiveLog, SelectObjectContentRequestFilterSensitiveLog, } from "../models/models_1";
import { de_SelectObjectContentCommand, se_SelectObjectContentCommand } from "../protocols/Aws_restXml";
export { $Command };
export class SelectObjectContentCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        getThrow200ExceptionsPlugin(config),
        getSsecPlugin(config),
    ];
})
    .s("AmazonS3", "SelectObjectContent", {
    eventStream: {
        output: true,
    },
})
    .n("S3Client", "SelectObjectContentCommand")
    .f(SelectObjectContentRequestFilterSensitiveLog, SelectObjectContentOutputFilterSensitiveLog)
    .ser(se_SelectObjectContentCommand)
    .de(de_SelectObjectContentCommand)
    .build() {
}
