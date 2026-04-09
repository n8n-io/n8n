import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeFeaturedResultsSetRequest, DescribeFeaturedResultsSetResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeFeaturedResultsSetCommand}.
 */
export interface DescribeFeaturedResultsSetCommandInput extends DescribeFeaturedResultsSetRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeFeaturedResultsSetCommand}.
 */
export interface DescribeFeaturedResultsSetCommandOutput extends DescribeFeaturedResultsSetResponse, __MetadataBearer {
}
declare const DescribeFeaturedResultsSetCommand_base: {
    new (input: DescribeFeaturedResultsSetCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeFeaturedResultsSetCommandInput, DescribeFeaturedResultsSetCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeFeaturedResultsSetCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeFeaturedResultsSetCommandInput, DescribeFeaturedResultsSetCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about a set of featured results. Features results are placed
 *             above all other results for certain queries. If there's an exact match of a query,
 *             then one or more specific documents are featured in the search results.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeFeaturedResultsSetCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeFeaturedResultsSetCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeFeaturedResultsSetRequest
 *   IndexId: "STRING_VALUE", // required
 *   FeaturedResultsSetId: "STRING_VALUE", // required
 * };
 * const command = new DescribeFeaturedResultsSetCommand(input);
 * const response = await client.send(command);
 * // { // DescribeFeaturedResultsSetResponse
 * //   FeaturedResultsSetId: "STRING_VALUE",
 * //   FeaturedResultsSetName: "STRING_VALUE",
 * //   Description: "STRING_VALUE",
 * //   Status: "ACTIVE" || "INACTIVE",
 * //   QueryTexts: [ // QueryTextList
 * //     "STRING_VALUE",
 * //   ],
 * //   FeaturedDocumentsWithMetadata: [ // FeaturedDocumentWithMetadataList
 * //     { // FeaturedDocumentWithMetadata
 * //       Id: "STRING_VALUE",
 * //       Title: "STRING_VALUE",
 * //       URI: "STRING_VALUE",
 * //     },
 * //   ],
 * //   FeaturedDocumentsMissing: [ // FeaturedDocumentMissingList
 * //     { // FeaturedDocumentMissing
 * //       Id: "STRING_VALUE",
 * //     },
 * //   ],
 * //   LastUpdatedTimestamp: Number("long"),
 * //   CreationTimestamp: Number("long"),
 * // };
 *
 * ```
 *
 * @param DescribeFeaturedResultsSetCommandInput - {@link DescribeFeaturedResultsSetCommandInput}
 * @returns {@link DescribeFeaturedResultsSetCommandOutput}
 * @see {@link DescribeFeaturedResultsSetCommandInput} for command's `input` shape.
 * @see {@link DescribeFeaturedResultsSetCommandOutput} for command's `response` shape.
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
export declare class DescribeFeaturedResultsSetCommand extends DescribeFeaturedResultsSetCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeFeaturedResultsSetRequest;
            output: DescribeFeaturedResultsSetResponse;
        };
        sdk: {
            input: DescribeFeaturedResultsSetCommandInput;
            output: DescribeFeaturedResultsSetCommandOutput;
        };
    };
}
