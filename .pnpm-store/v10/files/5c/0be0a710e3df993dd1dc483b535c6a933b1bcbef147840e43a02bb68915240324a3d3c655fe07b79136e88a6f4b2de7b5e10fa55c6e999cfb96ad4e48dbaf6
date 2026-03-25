import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAliasesRequest, ListAliasesResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListAliasesCommand}.
 */
export interface ListAliasesCommandInput extends ListAliasesRequest {
}
/**
 * @public
 *
 * The output of {@link ListAliasesCommand}.
 */
export interface ListAliasesCommandOutput extends ListAliasesResponse, __MetadataBearer {
}
declare const ListAliasesCommand_base: {
    new (input: ListAliasesCommandInput): import("@smithy/smithy-client").CommandImpl<ListAliasesCommandInput, ListAliasesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListAliasesCommandInput): import("@smithy/smithy-client").CommandImpl<ListAliasesCommandInput, ListAliasesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the aliases of a specified image or image version.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListAliasesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListAliasesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListAliasesRequest
 *   ImageName: "STRING_VALUE", // required
 *   Alias: "STRING_VALUE",
 *   Version: Number("int"),
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListAliasesCommand(input);
 * const response = await client.send(command);
 * // { // ListAliasesResponse
 * //   SageMakerImageVersionAliases: [ // SageMakerImageVersionAliases
 * //     "STRING_VALUE",
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListAliasesCommandInput - {@link ListAliasesCommandInput}
 * @returns {@link ListAliasesCommandOutput}
 * @see {@link ListAliasesCommandInput} for command's `input` shape.
 * @see {@link ListAliasesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListAliasesCommand extends ListAliasesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListAliasesRequest;
            output: ListAliasesResponse;
        };
        sdk: {
            input: ListAliasesCommandInput;
            output: ListAliasesCommandOutput;
        };
    };
}
