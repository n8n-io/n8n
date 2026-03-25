import { getThrow200ExceptionsPlugin } from "@aws-sdk/middleware-sdk-s3";
import { getSsecPlugin } from "@aws-sdk/middleware-ssec";
import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetObjectAttributesRequestFilterSensitiveLog, } from "../models/models_0";
import { de_GetObjectAttributesCommand, se_GetObjectAttributesCommand } from "../protocols/Aws_restXml";
export { $Command };
export class GetObjectAttributesCommand extends $Command
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
    .s("AmazonS3", "GetObjectAttributes", {})
    .n("S3Client", "GetObjectAttributesCommand")
    .f(GetObjectAttributesRequestFilterSensitiveLog, void 0)
    .ser(se_GetObjectAttributesCommand)
    .de(de_GetObjectAttributesCommand)
    .build() {
}
