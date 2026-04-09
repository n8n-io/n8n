import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListUserProfilesRequest, ListUserProfilesResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListUserProfilesCommand}.
 */
export interface ListUserProfilesCommandInput extends ListUserProfilesRequest {
}
/**
 * @public
 *
 * The output of {@link ListUserProfilesCommand}.
 */
export interface ListUserProfilesCommandOutput extends ListUserProfilesResponse, __MetadataBearer {
}
declare const ListUserProfilesCommand_base: {
    new (input: ListUserProfilesCommandInput): import("@smithy/smithy-client").CommandImpl<ListUserProfilesCommandInput, ListUserProfilesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListUserProfilesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListUserProfilesCommandInput, ListUserProfilesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists user profiles.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListUserProfilesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListUserProfilesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListUserProfilesRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   SortOrder: "Ascending" || "Descending",
 *   SortBy: "CreationTime" || "LastModifiedTime",
 *   DomainIdEquals: "STRING_VALUE",
 *   UserProfileNameContains: "STRING_VALUE",
 * };
 * const command = new ListUserProfilesCommand(input);
 * const response = await client.send(command);
 * // { // ListUserProfilesResponse
 * //   UserProfiles: [ // UserProfileList
 * //     { // UserProfileDetails
 * //       DomainId: "STRING_VALUE",
 * //       UserProfileName: "STRING_VALUE",
 * //       Status: "Deleting" || "Failed" || "InService" || "Pending" || "Updating" || "Update_Failed" || "Delete_Failed",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListUserProfilesCommandInput - {@link ListUserProfilesCommandInput}
 * @returns {@link ListUserProfilesCommandOutput}
 * @see {@link ListUserProfilesCommandInput} for command's `input` shape.
 * @see {@link ListUserProfilesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListUserProfilesCommand extends ListUserProfilesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListUserProfilesRequest;
            output: ListUserProfilesResponse;
        };
        sdk: {
            input: ListUserProfilesCommandInput;
            output: ListUserProfilesCommandOutput;
        };
    };
}
