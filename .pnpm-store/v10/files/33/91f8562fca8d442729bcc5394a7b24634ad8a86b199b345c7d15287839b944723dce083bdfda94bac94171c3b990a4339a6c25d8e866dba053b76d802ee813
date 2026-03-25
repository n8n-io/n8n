import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListDomainDeliverabilityCampaignsCommand, se_ListDomainDeliverabilityCampaignsCommand, } from "../protocols/Aws_restJson1";
export { $Command };
export class ListDomainDeliverabilityCampaignsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListDomainDeliverabilityCampaigns", {})
    .n("SESv2Client", "ListDomainDeliverabilityCampaignsCommand")
    .f(void 0, void 0)
    .ser(se_ListDomainDeliverabilityCampaignsCommand)
    .de(de_ListDomainDeliverabilityCampaignsCommand)
    .build() {
}
