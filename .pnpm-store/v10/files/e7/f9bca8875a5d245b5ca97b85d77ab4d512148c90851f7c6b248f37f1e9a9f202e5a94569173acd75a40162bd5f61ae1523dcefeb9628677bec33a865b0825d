import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { QueryLineageRequest, QueryLineageResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link QueryLineageCommand}.
 */
export interface QueryLineageCommandInput extends QueryLineageRequest {
}
/**
 * @public
 *
 * The output of {@link QueryLineageCommand}.
 */
export interface QueryLineageCommandOutput extends QueryLineageResponse, __MetadataBearer {
}
declare const QueryLineageCommand_base: {
    new (input: QueryLineageCommandInput): import("@smithy/smithy-client").CommandImpl<QueryLineageCommandInput, QueryLineageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [QueryLineageCommandInput]): import("@smithy/smithy-client").CommandImpl<QueryLineageCommandInput, QueryLineageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Use this action to inspect your lineage and discover relationships between entities. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/querying-lineage-entities.html"> Querying Lineage Entities</a> in the <i>Amazon SageMaker Developer Guide</i>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, QueryLineageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, QueryLineageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // QueryLineageRequest
 *   StartArns: [ // QueryLineageStartArns
 *     "STRING_VALUE",
 *   ],
 *   Direction: "Both" || "Ascendants" || "Descendants",
 *   IncludeEdges: true || false,
 *   Filters: { // QueryFilters
 *     Types: [ // QueryTypes
 *       "STRING_VALUE",
 *     ],
 *     LineageTypes: [ // QueryLineageTypes
 *       "TrialComponent" || "Artifact" || "Context" || "Action",
 *     ],
 *     CreatedBefore: new Date("TIMESTAMP"),
 *     CreatedAfter: new Date("TIMESTAMP"),
 *     ModifiedBefore: new Date("TIMESTAMP"),
 *     ModifiedAfter: new Date("TIMESTAMP"),
 *     Properties: { // QueryProperties
 *       "<keys>": "STRING_VALUE",
 *     },
 *   },
 *   MaxDepth: Number("int"),
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new QueryLineageCommand(input);
 * const response = await client.send(command);
 * // { // QueryLineageResponse
 * //   Vertices: [ // Vertices
 * //     { // Vertex
 * //       Arn: "STRING_VALUE",
 * //       Type: "STRING_VALUE",
 * //       LineageType: "TrialComponent" || "Artifact" || "Context" || "Action",
 * //     },
 * //   ],
 * //   Edges: [ // Edges
 * //     { // Edge
 * //       SourceArn: "STRING_VALUE",
 * //       DestinationArn: "STRING_VALUE",
 * //       AssociationType: "ContributedTo" || "AssociatedWith" || "DerivedFrom" || "Produced" || "SameAs",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param QueryLineageCommandInput - {@link QueryLineageCommandInput}
 * @returns {@link QueryLineageCommandOutput}
 * @see {@link QueryLineageCommandInput} for command's `input` shape.
 * @see {@link QueryLineageCommandOutput} for command's `response` shape.
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
export declare class QueryLineageCommand extends QueryLineageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: QueryLineageRequest;
            output: QueryLineageResponse;
        };
        sdk: {
            input: QueryLineageCommandInput;
            output: QueryLineageCommandOutput;
        };
    };
}
