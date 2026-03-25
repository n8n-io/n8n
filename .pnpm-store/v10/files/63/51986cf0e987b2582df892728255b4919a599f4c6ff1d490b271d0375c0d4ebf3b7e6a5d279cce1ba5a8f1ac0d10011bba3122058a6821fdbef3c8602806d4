import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTagsInput, ListTagsOutput } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTagsCommand}.
 */
export interface ListTagsCommandInput extends ListTagsInput {
}
/**
 * @public
 *
 * The output of {@link ListTagsCommand}.
 */
export interface ListTagsCommandOutput extends ListTagsOutput, __MetadataBearer {
}
declare const ListTagsCommand_base: {
    new (input: ListTagsCommandInput): import("@smithy/smithy-client").CommandImpl<ListTagsCommandInput, ListTagsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListTagsCommandInput): import("@smithy/smithy-client").CommandImpl<ListTagsCommandInput, ListTagsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns the tags for the specified SageMaker resource.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListTagsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListTagsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListTagsInput
 *   ResourceArn: "STRING_VALUE", // required
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListTagsCommand(input);
 * const response = await client.send(command);
 * // { // ListTagsOutput
 * //   Tags: [ // TagList
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTagsCommandInput - {@link ListTagsCommandInput}
 * @returns {@link ListTagsCommandOutput}
 * @see {@link ListTagsCommandInput} for command's `input` shape.
 * @see {@link ListTagsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListTagsCommand extends ListTagsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTagsInput;
            output: ListTagsOutput;
        };
        sdk: {
            input: ListTagsCommandInput;
            output: ListTagsCommandOutput;
        };
    };
}
