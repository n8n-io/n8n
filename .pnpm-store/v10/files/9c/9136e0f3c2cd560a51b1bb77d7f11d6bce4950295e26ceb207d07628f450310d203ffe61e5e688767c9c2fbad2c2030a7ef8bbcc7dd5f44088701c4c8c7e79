import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListImageVersionsRequest, ListImageVersionsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListImageVersionsCommand}.
 */
export interface ListImageVersionsCommandInput extends ListImageVersionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListImageVersionsCommand}.
 */
export interface ListImageVersionsCommandOutput extends ListImageVersionsResponse, __MetadataBearer {
}
declare const ListImageVersionsCommand_base: {
    new (input: ListImageVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListImageVersionsCommandInput, ListImageVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListImageVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListImageVersionsCommandInput, ListImageVersionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the versions of a specified image and their properties. The list can be filtered by creation time or modified time.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListImageVersionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListImageVersionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListImageVersionsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   ImageName: "STRING_VALUE", // required
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 *   SortBy: "CREATION_TIME" || "LAST_MODIFIED_TIME" || "VERSION",
 *   SortOrder: "ASCENDING" || "DESCENDING",
 * };
 * const command = new ListImageVersionsCommand(input);
 * const response = await client.send(command);
 * // { // ListImageVersionsResponse
 * //   ImageVersions: [ // ImageVersions
 * //     { // ImageVersion
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       FailureReason: "STRING_VALUE",
 * //       ImageArn: "STRING_VALUE", // required
 * //       ImageVersionArn: "STRING_VALUE", // required
 * //       ImageVersionStatus: "CREATING" || "CREATED" || "CREATE_FAILED" || "DELETING" || "DELETE_FAILED", // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       Version: Number("int"), // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListImageVersionsCommandInput - {@link ListImageVersionsCommandInput}
 * @returns {@link ListImageVersionsCommandOutput}
 * @see {@link ListImageVersionsCommandInput} for command's `input` shape.
 * @see {@link ListImageVersionsCommandOutput} for command's `response` shape.
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
export declare class ListImageVersionsCommand extends ListImageVersionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListImageVersionsRequest;
            output: ListImageVersionsResponse;
        };
        sdk: {
            input: ListImageVersionsCommandInput;
            output: ListImageVersionsCommandOutput;
        };
    };
}
