import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListHubContentVersionsRequest, ListHubContentVersionsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListHubContentVersionsCommand}.
 */
export interface ListHubContentVersionsCommandInput extends ListHubContentVersionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListHubContentVersionsCommand}.
 */
export interface ListHubContentVersionsCommandOutput extends ListHubContentVersionsResponse, __MetadataBearer {
}
declare const ListHubContentVersionsCommand_base: {
    new (input: ListHubContentVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListHubContentVersionsCommandInput, ListHubContentVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListHubContentVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListHubContentVersionsCommandInput, ListHubContentVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List hub content versions.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListHubContentVersionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListHubContentVersionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListHubContentVersionsRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 *   HubContentName: "STRING_VALUE", // required
 *   MinVersion: "STRING_VALUE",
 *   MaxSchemaVersion: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   SortBy: "HubContentName" || "CreationTime" || "HubContentStatus",
 *   SortOrder: "Ascending" || "Descending",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListHubContentVersionsCommand(input);
 * const response = await client.send(command);
 * // { // ListHubContentVersionsResponse
 * //   HubContentSummaries: [ // HubContentInfoList // required
 * //     { // HubContentInfo
 * //       HubContentName: "STRING_VALUE", // required
 * //       HubContentArn: "STRING_VALUE", // required
 * //       SageMakerPublicHubContentArn: "STRING_VALUE",
 * //       HubContentVersion: "STRING_VALUE", // required
 * //       HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 * //       DocumentSchemaVersion: "STRING_VALUE", // required
 * //       HubContentDisplayName: "STRING_VALUE",
 * //       HubContentDescription: "STRING_VALUE",
 * //       SupportStatus: "Supported" || "Deprecated" || "Restricted",
 * //       HubContentSearchKeywords: [ // HubContentSearchKeywordList
 * //         "STRING_VALUE",
 * //       ],
 * //       HubContentStatus: "Available" || "Importing" || "Deleting" || "ImportFailed" || "DeleteFailed" || "PendingImport" || "PendingDelete", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       OriginalCreationTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListHubContentVersionsCommandInput - {@link ListHubContentVersionsCommandInput}
 * @returns {@link ListHubContentVersionsCommandOutput}
 * @see {@link ListHubContentVersionsCommandInput} for command's `input` shape.
 * @see {@link ListHubContentVersionsCommandOutput} for command's `response` shape.
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
export declare class ListHubContentVersionsCommand extends ListHubContentVersionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListHubContentVersionsRequest;
            output: ListHubContentVersionsResponse;
        };
        sdk: {
            input: ListHubContentVersionsCommandInput;
            output: ListHubContentVersionsCommandOutput;
        };
    };
}
