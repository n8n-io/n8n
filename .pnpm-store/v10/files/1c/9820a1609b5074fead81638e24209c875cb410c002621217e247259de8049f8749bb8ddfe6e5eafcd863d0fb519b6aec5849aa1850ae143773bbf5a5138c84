import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeQuerySuggestionsBlockListRequest, DescribeQuerySuggestionsBlockListResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeQuerySuggestionsBlockListCommand}.
 */
export interface DescribeQuerySuggestionsBlockListCommandInput extends DescribeQuerySuggestionsBlockListRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeQuerySuggestionsBlockListCommand}.
 */
export interface DescribeQuerySuggestionsBlockListCommandOutput extends DescribeQuerySuggestionsBlockListResponse, __MetadataBearer {
}
declare const DescribeQuerySuggestionsBlockListCommand_base: {
    new (input: DescribeQuerySuggestionsBlockListCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeQuerySuggestionsBlockListCommandInput, DescribeQuerySuggestionsBlockListCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeQuerySuggestionsBlockListCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeQuerySuggestionsBlockListCommandInput, DescribeQuerySuggestionsBlockListCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about a block list used for query suggestions for
 *             an index.</p>
 *          <p>This is used to check the current settings that are applied to a
 *             block list.</p>
 *          <p>
 *             <code>DescribeQuerySuggestionsBlockList</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeQuerySuggestionsBlockListCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeQuerySuggestionsBlockListCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeQuerySuggestionsBlockListRequest
 *   IndexId: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 * };
 * const command = new DescribeQuerySuggestionsBlockListCommand(input);
 * const response = await client.send(command);
 * // { // DescribeQuerySuggestionsBlockListResponse
 * //   IndexId: "STRING_VALUE",
 * //   Id: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   Description: "STRING_VALUE",
 * //   Status: "ACTIVE" || "CREATING" || "DELETING" || "UPDATING" || "ACTIVE_BUT_UPDATE_FAILED" || "FAILED",
 * //   ErrorMessage: "STRING_VALUE",
 * //   CreatedAt: new Date("TIMESTAMP"),
 * //   UpdatedAt: new Date("TIMESTAMP"),
 * //   SourceS3Path: { // S3Path
 * //     Bucket: "STRING_VALUE", // required
 * //     Key: "STRING_VALUE", // required
 * //   },
 * //   ItemCount: Number("int"),
 * //   FileSizeBytes: Number("long"),
 * //   RoleArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeQuerySuggestionsBlockListCommandInput - {@link DescribeQuerySuggestionsBlockListCommandInput}
 * @returns {@link DescribeQuerySuggestionsBlockListCommandOutput}
 * @see {@link DescribeQuerySuggestionsBlockListCommandInput} for command's `input` shape.
 * @see {@link DescribeQuerySuggestionsBlockListCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class DescribeQuerySuggestionsBlockListCommand extends DescribeQuerySuggestionsBlockListCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeQuerySuggestionsBlockListRequest;
            output: DescribeQuerySuggestionsBlockListResponse;
        };
        sdk: {
            input: DescribeQuerySuggestionsBlockListCommandInput;
            output: DescribeQuerySuggestionsBlockListCommandOutput;
        };
    };
}
