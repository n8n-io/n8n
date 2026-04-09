import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeThesaurusRequest, DescribeThesaurusResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeThesaurusCommand}.
 */
export interface DescribeThesaurusCommandInput extends DescribeThesaurusRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeThesaurusCommand}.
 */
export interface DescribeThesaurusCommandOutput extends DescribeThesaurusResponse, __MetadataBearer {
}
declare const DescribeThesaurusCommand_base: {
    new (input: DescribeThesaurusCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeThesaurusCommandInput, DescribeThesaurusCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeThesaurusCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeThesaurusCommandInput, DescribeThesaurusCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about an Amazon Kendra thesaurus.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeThesaurusCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeThesaurusCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeThesaurusRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 * };
 * const command = new DescribeThesaurusCommand(input);
 * const response = await client.send(command);
 * // { // DescribeThesaurusResponse
 * //   Id: "STRING_VALUE",
 * //   IndexId: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   Description: "STRING_VALUE",
 * //   Status: "CREATING" || "ACTIVE" || "DELETING" || "UPDATING" || "ACTIVE_BUT_UPDATE_FAILED" || "FAILED",
 * //   ErrorMessage: "STRING_VALUE",
 * //   CreatedAt: new Date("TIMESTAMP"),
 * //   UpdatedAt: new Date("TIMESTAMP"),
 * //   RoleArn: "STRING_VALUE",
 * //   SourceS3Path: { // S3Path
 * //     Bucket: "STRING_VALUE", // required
 * //     Key: "STRING_VALUE", // required
 * //   },
 * //   FileSizeBytes: Number("long"),
 * //   TermCount: Number("long"),
 * //   SynonymRuleCount: Number("long"),
 * // };
 *
 * ```
 *
 * @param DescribeThesaurusCommandInput - {@link DescribeThesaurusCommandInput}
 * @returns {@link DescribeThesaurusCommandOutput}
 * @see {@link DescribeThesaurusCommandInput} for command's `input` shape.
 * @see {@link DescribeThesaurusCommandOutput} for command's `response` shape.
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
export declare class DescribeThesaurusCommand extends DescribeThesaurusCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeThesaurusRequest;
            output: DescribeThesaurusResponse;
        };
        sdk: {
            input: DescribeThesaurusCommandInput;
            output: DescribeThesaurusCommandOutput;
        };
    };
}
