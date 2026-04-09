import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListContextsRequest, ListContextsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListContextsCommand}.
 */
export interface ListContextsCommandInput extends ListContextsRequest {
}
/**
 * @public
 *
 * The output of {@link ListContextsCommand}.
 */
export interface ListContextsCommandOutput extends ListContextsResponse, __MetadataBearer {
}
declare const ListContextsCommand_base: {
    new (input: ListContextsCommandInput): import("@smithy/smithy-client").CommandImpl<ListContextsCommandInput, ListContextsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListContextsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListContextsCommandInput, ListContextsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the contexts in your account and their properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListContextsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListContextsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListContextsRequest
 *   SourceUri: "STRING_VALUE",
 *   ContextType: "STRING_VALUE",
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListContextsCommand(input);
 * const response = await client.send(command);
 * // { // ListContextsResponse
 * //   ContextSummaries: [ // ContextSummaries
 * //     { // ContextSummary
 * //       ContextArn: "STRING_VALUE",
 * //       ContextName: "STRING_VALUE",
 * //       Source: { // ContextSource
 * //         SourceUri: "STRING_VALUE", // required
 * //         SourceType: "STRING_VALUE",
 * //         SourceId: "STRING_VALUE",
 * //       },
 * //       ContextType: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListContextsCommandInput - {@link ListContextsCommandInput}
 * @returns {@link ListContextsCommandOutput}
 * @see {@link ListContextsCommandInput} for command's `input` shape.
 * @see {@link ListContextsCommandOutput} for command's `response` shape.
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
export declare class ListContextsCommand extends ListContextsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListContextsRequest;
            output: ListContextsResponse;
        };
        sdk: {
            input: ListContextsCommandInput;
            output: ListContextsCommandOutput;
        };
    };
}
