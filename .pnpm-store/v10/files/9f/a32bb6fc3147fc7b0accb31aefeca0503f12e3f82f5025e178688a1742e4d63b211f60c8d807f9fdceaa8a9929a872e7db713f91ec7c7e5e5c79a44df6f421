import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListImagesRequest, ListImagesResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListImagesCommand}.
 */
export interface ListImagesCommandInput extends ListImagesRequest {
}
/**
 * @public
 *
 * The output of {@link ListImagesCommand}.
 */
export interface ListImagesCommandOutput extends ListImagesResponse, __MetadataBearer {
}
declare const ListImagesCommand_base: {
    new (input: ListImagesCommandInput): import("@smithy/smithy-client").CommandImpl<ListImagesCommandInput, ListImagesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListImagesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListImagesCommandInput, ListImagesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the images in your account and their properties. The list can be filtered by creation time or modified time, and whether the image name contains a specified string.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListImagesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListImagesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListImagesRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "CREATION_TIME" || "LAST_MODIFIED_TIME" || "IMAGE_NAME",
 *   SortOrder: "ASCENDING" || "DESCENDING",
 * };
 * const command = new ListImagesCommand(input);
 * const response = await client.send(command);
 * // { // ListImagesResponse
 * //   Images: [ // Images
 * //     { // Image
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       Description: "STRING_VALUE",
 * //       DisplayName: "STRING_VALUE",
 * //       FailureReason: "STRING_VALUE",
 * //       ImageArn: "STRING_VALUE", // required
 * //       ImageName: "STRING_VALUE", // required
 * //       ImageStatus: "CREATING" || "CREATED" || "CREATE_FAILED" || "UPDATING" || "UPDATE_FAILED" || "DELETING" || "DELETE_FAILED", // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListImagesCommandInput - {@link ListImagesCommandInput}
 * @returns {@link ListImagesCommandOutput}
 * @see {@link ListImagesCommandInput} for command's `input` shape.
 * @see {@link ListImagesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListImagesCommand extends ListImagesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListImagesRequest;
            output: ListImagesResponse;
        };
        sdk: {
            input: ListImagesCommandInput;
            output: ListImagesCommandOutput;
        };
    };
}
