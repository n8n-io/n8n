import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { GetObjectTorrentOutputFilterSensitiveLog, } from "../models/models_0";
import { de_GetObjectTorrentCommand, se_GetObjectTorrentCommand } from "../protocols/Aws_restXml";
export { $Command };
export class GetObjectTorrentCommand extends $Command
    .classBuilder()
    .ep({
    ...commonParams,
    Bucket: { type: "contextParams", name: "Bucket" },
})
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AmazonS3", "GetObjectTorrent", {})
    .n("S3Client", "GetObjectTorrentCommand")
    .f(void 0, GetObjectTorrentOutputFilterSensitiveLog)
    .ser(se_GetObjectTorrentCommand)
    .de(de_GetObjectTorrentCommand)
    .build() {
}
