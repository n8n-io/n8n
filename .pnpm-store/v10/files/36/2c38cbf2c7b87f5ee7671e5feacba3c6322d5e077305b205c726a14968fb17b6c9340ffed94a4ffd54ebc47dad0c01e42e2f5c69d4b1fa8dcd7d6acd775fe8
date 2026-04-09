import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ImportHubContentRequest, ImportHubContentResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ImportHubContentCommand}.
 */
export interface ImportHubContentCommandInput extends ImportHubContentRequest {
}
/**
 * @public
 *
 * The output of {@link ImportHubContentCommand}.
 */
export interface ImportHubContentCommandOutput extends ImportHubContentResponse, __MetadataBearer {
}
declare const ImportHubContentCommand_base: {
    new (input: ImportHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<ImportHubContentCommandInput, ImportHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ImportHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<ImportHubContentCommandInput, ImportHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Import hub content.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ImportHubContentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ImportHubContentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ImportHubContentRequest
 *   HubContentName: "STRING_VALUE", // required
 *   HubContentVersion: "STRING_VALUE",
 *   HubContentType: "Model" || "Notebook" || "ModelReference" || "DataSet" || "JsonDoc", // required
 *   DocumentSchemaVersion: "STRING_VALUE", // required
 *   HubName: "STRING_VALUE", // required
 *   HubContentDisplayName: "STRING_VALUE",
 *   HubContentDescription: "STRING_VALUE",
 *   HubContentMarkdown: "STRING_VALUE",
 *   HubContentDocument: "STRING_VALUE", // required
 *   SupportStatus: "Supported" || "Deprecated" || "Restricted",
 *   HubContentSearchKeywords: [ // HubContentSearchKeywordList
 *     "STRING_VALUE",
 *   ],
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new ImportHubContentCommand(input);
 * const response = await client.send(command);
 * // { // ImportHubContentResponse
 * //   HubArn: "STRING_VALUE", // required
 * //   HubContentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param ImportHubContentCommandInput - {@link ImportHubContentCommandInput}
 * @returns {@link ImportHubContentCommandOutput}
 * @see {@link ImportHubContentCommandInput} for command's `input` shape.
 * @see {@link ImportHubContentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class ImportHubContentCommand extends ImportHubContentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ImportHubContentRequest;
            output: ImportHubContentResponse;
        };
        sdk: {
            input: ImportHubContentCommandInput;
            output: ImportHubContentCommandOutput;
        };
    };
}
