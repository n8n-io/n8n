import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DeleteAccessControlConfigurationCommand, se_DeleteAccessControlConfigurationCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DeleteAccessControlConfigurationCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "DeleteAccessControlConfiguration", {})
    .n("KendraClient", "DeleteAccessControlConfigurationCommand")
    .f(void 0, void 0)
    .ser(se_DeleteAccessControlConfigurationCommand)
    .de(de_DeleteAccessControlConfigurationCommand)
    .build() {
}
