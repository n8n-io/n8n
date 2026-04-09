import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeIndexRequest, DescribeIndexResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeIndexCommand}.
 */
export interface DescribeIndexCommandInput extends DescribeIndexRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeIndexCommand}.
 */
export interface DescribeIndexCommandOutput extends DescribeIndexResponse, __MetadataBearer {
}
declare const DescribeIndexCommand_base: {
    new (input: DescribeIndexCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeIndexCommandInput, DescribeIndexCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeIndexCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeIndexCommandInput, DescribeIndexCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about an Amazon Kendra index.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeIndexCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeIndexCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeIndexRequest
 *   Id: "STRING_VALUE", // required
 * };
 * const command = new DescribeIndexCommand(input);
 * const response = await client.send(command);
 * // { // DescribeIndexResponse
 * //   Name: "STRING_VALUE",
 * //   Id: "STRING_VALUE",
 * //   Edition: "DEVELOPER_EDITION" || "ENTERPRISE_EDITION" || "GEN_AI_ENTERPRISE_EDITION",
 * //   RoleArn: "STRING_VALUE",
 * //   ServerSideEncryptionConfiguration: { // ServerSideEncryptionConfiguration
 * //     KmsKeyId: "STRING_VALUE",
 * //   },
 * //   Status: "CREATING" || "ACTIVE" || "DELETING" || "FAILED" || "UPDATING" || "SYSTEM_UPDATING",
 * //   Description: "STRING_VALUE",
 * //   CreatedAt: new Date("TIMESTAMP"),
 * //   UpdatedAt: new Date("TIMESTAMP"),
 * //   DocumentMetadataConfigurations: [ // DocumentMetadataConfigurationList
 * //     { // DocumentMetadataConfiguration
 * //       Name: "STRING_VALUE", // required
 * //       Type: "STRING_VALUE" || "STRING_LIST_VALUE" || "LONG_VALUE" || "DATE_VALUE", // required
 * //       Relevance: { // Relevance
 * //         Freshness: true || false,
 * //         Importance: Number("int"),
 * //         Duration: "STRING_VALUE",
 * //         RankOrder: "ASCENDING" || "DESCENDING",
 * //         ValueImportanceMap: { // ValueImportanceMap
 * //           "<keys>": Number("int"),
 * //         },
 * //       },
 * //       Search: { // Search
 * //         Facetable: true || false,
 * //         Searchable: true || false,
 * //         Displayable: true || false,
 * //         Sortable: true || false,
 * //       },
 * //     },
 * //   ],
 * //   IndexStatistics: { // IndexStatistics
 * //     FaqStatistics: { // FaqStatistics
 * //       IndexedQuestionAnswersCount: Number("int"), // required
 * //     },
 * //     TextDocumentStatistics: { // TextDocumentStatistics
 * //       IndexedTextDocumentsCount: Number("int"), // required
 * //       IndexedTextBytes: Number("long"), // required
 * //     },
 * //   },
 * //   ErrorMessage: "STRING_VALUE",
 * //   CapacityUnits: { // CapacityUnitsConfiguration
 * //     StorageCapacityUnits: Number("int"), // required
 * //     QueryCapacityUnits: Number("int"), // required
 * //   },
 * //   UserTokenConfigurations: [ // UserTokenConfigurationList
 * //     { // UserTokenConfiguration
 * //       JwtTokenTypeConfiguration: { // JwtTokenTypeConfiguration
 * //         KeyLocation: "URL" || "SECRET_MANAGER", // required
 * //         URL: "STRING_VALUE",
 * //         SecretManagerArn: "STRING_VALUE",
 * //         UserNameAttributeField: "STRING_VALUE",
 * //         GroupAttributeField: "STRING_VALUE",
 * //         Issuer: "STRING_VALUE",
 * //         ClaimRegex: "STRING_VALUE",
 * //       },
 * //       JsonTokenTypeConfiguration: { // JsonTokenTypeConfiguration
 * //         UserNameAttributeField: "STRING_VALUE", // required
 * //         GroupAttributeField: "STRING_VALUE", // required
 * //       },
 * //     },
 * //   ],
 * //   UserContextPolicy: "ATTRIBUTE_FILTER" || "USER_TOKEN",
 * //   UserGroupResolutionConfiguration: { // UserGroupResolutionConfiguration
 * //     UserGroupResolutionMode: "AWS_SSO" || "NONE", // required
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeIndexCommandInput - {@link DescribeIndexCommandInput}
 * @returns {@link DescribeIndexCommandOutput}
 * @see {@link DescribeIndexCommandInput} for command's `input` shape.
 * @see {@link DescribeIndexCommandOutput} for command's `response` shape.
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
export declare class DescribeIndexCommand extends DescribeIndexCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeIndexRequest;
            output: DescribeIndexResponse;
        };
        sdk: {
            input: DescribeIndexCommandInput;
            output: DescribeIndexCommandOutput;
        };
    };
}
