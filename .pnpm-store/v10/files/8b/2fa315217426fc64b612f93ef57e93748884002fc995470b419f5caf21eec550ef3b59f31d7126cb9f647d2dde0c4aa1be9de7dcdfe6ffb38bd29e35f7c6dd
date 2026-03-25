import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListAccessControlConfigurationsCommand, se_ListAccessControlConfigurationsCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class ListAccessControlConfigurationsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "ListAccessControlConfigurations", {})
    .n("KendraClient", "ListAccessControlConfigurationsCommand")
    .f(void 0, void 0)
    .ser(se_ListAccessControlConfigurationsCommand)
    .de(de_ListAccessControlConfigurationsCommand)
    .build() {
}
