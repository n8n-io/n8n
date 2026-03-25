import { getEndpointPlugin } from "@smithy/middleware-endpoint";
import { getSerdePlugin } from "@smithy/middleware-serde";
import { Command as $Command } from "@smithy/smithy-client";
import { commonParams } from "../endpoint/EndpointParameters";
import { de_ListAssociationsCommand, se_ListAssociationsCommand } from "../protocols/Aws_json1_1";
export { $Command };
export class ListAssociationsCommand extends $Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        getSerdePlugin(config, this.serialize, this.deserialize),
        getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SageMaker", "ListAssociations", {})
    .n("SageMakerClient", "ListAssociationsCommand")
    .f(void 0, void 0)
    .ser(se_ListAssociationsCommand)
    .de(de_ListAssociationsCommand)
    .build() {
}
