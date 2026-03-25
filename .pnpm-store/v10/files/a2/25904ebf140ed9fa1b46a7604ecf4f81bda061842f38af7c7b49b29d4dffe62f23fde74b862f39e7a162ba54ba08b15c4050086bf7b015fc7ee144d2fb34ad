import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_DisassociatePersonasFromEntitiesCommand, se_DisassociatePersonasFromEntitiesCommand, } from "../protocols/Aws_json1_1";
export { $Command };
export class DisassociatePersonasFromEntitiesCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("AWSKendraFrontendService", "DisassociatePersonasFromEntities", {})
    .n("KendraClient", "DisassociatePersonasFromEntitiesCommand")
    .f(void 0, void 0)
    .ser(se_DisassociatePersonasFromEntitiesCommand)
    .de(de_DisassociatePersonasFromEntitiesCommand)
    .build() {
}
