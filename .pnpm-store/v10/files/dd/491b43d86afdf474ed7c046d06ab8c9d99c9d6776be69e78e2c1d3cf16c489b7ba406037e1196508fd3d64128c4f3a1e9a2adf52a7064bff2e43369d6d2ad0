import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListArtifactsRequest, ListArtifactsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListArtifactsCommand}.
 */
export interface ListArtifactsCommandInput extends ListArtifactsRequest {
}
/**
 * @public
 *
 * The output of {@link ListArtifactsCommand}.
 */
export interface ListArtifactsCommandOutput extends ListArtifactsResponse, __MetadataBearer {
}
declare const ListArtifactsCommand_base: {
    new (input: ListArtifactsCommandInput): import("@smithy/smithy-client").CommandImpl<ListArtifactsCommandInput, ListArtifactsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListArtifactsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListArtifactsCommandInput, ListArtifactsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the artifacts in your account and their properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListArtifactsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListArtifactsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListArtifactsRequest
 *   SourceUri: "STRING_VALUE",
 *   ArtifactType: "STRING_VALUE",
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListArtifactsCommand(input);
 * const response = await client.send(command);
 * // { // ListArtifactsResponse
 * //   ArtifactSummaries: [ // ArtifactSummaries
 * //     { // ArtifactSummary
 * //       ArtifactArn: "STRING_VALUE",
 * //       ArtifactName: "STRING_VALUE",
 * //       Source: { // ArtifactSource
 * //         SourceUri: "STRING_VALUE", // required
 * //         SourceTypes: [ // ArtifactSourceTypes
 * //           { // ArtifactSourceType
 * //             SourceIdType: "MD5Hash" || "S3ETag" || "S3Version" || "Custom", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //         ],
 * //       },
 * //       ArtifactType: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListArtifactsCommandInput - {@link ListArtifactsCommandInput}
 * @returns {@link ListArtifactsCommandOutput}
 * @see {@link ListArtifactsCommandInput} for command's `input` shape.
 * @see {@link ListArtifactsCommandOutput} for command's `response` shape.
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
export declare class ListArtifactsCommand extends ListArtifactsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListArtifactsRequest;
            output: ListArtifactsResponse;
        };
        sdk: {
            input: ListArtifactsCommandInput;
            output: ListArtifactsCommandOutput;
        };
    };
}
