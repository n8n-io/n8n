import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListHubContentsRequest, ListHubContentsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListHubContentsCommand}.
 */
export interface ListHubContentsCommandInput extends ListHubContentsRequest {
}
/**
 * @public
 *
 * The output of {@link ListHubContentsCommand}.
 */
export interface ListHubContentsCommandOutput extends ListHubContentsResponse, __MetadataBearer {
}
declare const ListHubContentsCommand_base: {
    new (input: ListHubContentsCommandInput): import("@smithy/smithy-client").CommandImpl<ListHubContentsCommandInput, ListHubContentsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListHubContentsCommandInput): import("@smithy/smithy-client").CommandImpl<ListHubContentsCommandInput, ListHubContentsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List the contents of a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListHubContentsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListHubContentsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListHubContentsRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference", // required
 *   NameContains: "STRING_VALUE",
 *   MaxSchemaVersion: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   SortBy: "HubContentName" || "CreationTime" || "HubContentStatus",
 *   SortOrder: "Ascending" || "Descending",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListHubContentsCommand(input);
 * const response = await client.send(command);
 * // { // ListHubContentsResponse
 * //   HubContentSummaries: [ // HubContentInfoList // required
 * //     { // HubContentInfo
 * //       HubContentName: "STRING_VALUE", // required
 * //       HubContentArn: "STRING_VALUE", // required
 * //       SageMakerPublicHubContentArn: "STRING_VALUE",
 * //       HubContentVersion: "STRING_VALUE", // required
 * //       HubContentType: "Model" || "Notebook" || "ModelReference", // required
 * //       DocumentSchemaVersion: "STRING_VALUE", // required
 * //       HubContentDisplayName: "STRING_VALUE",
 * //       HubContentDescription: "STRING_VALUE",
 * //       SupportStatus: "Supported" || "Deprecated" || "Restricted",
 * //       HubContentSearchKeywords: [ // HubContentSearchKeywordList
 * //         "STRING_VALUE",
 * //       ],
 * //       HubContentStatus: "Available" || "Importing" || "Deleting" || "ImportFailed" || "DeleteFailed", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       OriginalCreationTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListHubContentsCommandInput - {@link ListHubContentsCommandInput}
 * @returns {@link ListHubContentsCommandOutput}
 * @see {@link ListHubContentsCommandInput} for command's `input` shape.
 * @see {@link ListHubContentsCommandOutput} for command's `response` shape.
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
export declare class ListHubContentsCommand extends ListHubContentsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListHubContentsRequest;
            output: ListHubContentsResponse;
        };
        sdk: {
            input: ListHubContentsCommandInput;
            output: ListHubContentsCommandOutput;
        };
    };
}
